from flask import Flask, render_template, request, jsonify
from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator
from qiskit import transpile
import random

app = Flask(__name__)

def simular_con_espia(bit_alice, base_alice, base_bob, espia_activo=False, base_espia=None):
    if base_espia is None and espia_activo:
        base_espia = random.randint(0, 1)
    
    qc = QuantumCircuit(1, 1)
    
    # Alice
    if base_alice == 0:
        if bit_alice == 1:
            qc.x(0)
        estado_alice = "|0⟩" if bit_alice == 0 else "|1⟩"
    else:
        qc.h(0)
        if bit_alice == 1:
            qc.z(0)
        estado_alice = "|+⟩" if bit_alice == 0 else "|-⟩"
    
    # Espía
    bit_medido_espia = None
    base_espia_nombre = None
    
    if espia_activo:
        base_espia_nombre = "Base Z" if base_espia == 0 else "Base X"
        
        qc_eve = qc.copy()
        if base_espia == 1:
            qc_eve.h(0)
        qc_eve.measure(0, 0)
        
        backend = AerSimulator()
        compiled = transpile(qc_eve, backend)
        resultado = backend.run(compiled, shots=1).result()
        bit_medido_espia = int(list(resultado.get_counts().keys())[0])
        
        qc = QuantumCircuit(1, 1)
        if base_espia == 0:
            if bit_medido_espia == 1:
                qc.x(0)
        else:
            qc.h(0)
            if bit_medido_espia == 1:
                qc.z(0)
    
    # Bob
    if base_bob == 1:
        qc.h(0)
    qc.measure(0, 0)
    
    backend = AerSimulator()
    compiled = transpile(qc, backend)
    resultado = backend.run(compiled, shots=1).result()
    medicion_bob = int(list(resultado.get_counts().keys())[0])
    
    bases_coinciden = (base_alice == base_bob)
    exito = bases_coinciden
    bit_deducido_bob = medicion_bob if exito else None
    
    # Colores
    if base_alice == 0:
        color_alice = '#4CAF50' if bit_alice == 0 else '#2196F3'
    else:
        color_alice = '#ff4444' if bit_alice == 0 else '#FF9800'
    color_bob = '#42a5f5' if base_bob == 0 else '#ffa726'
    
    return {
        'indice': 0,
        'bit_alice': bit_alice,
        'base_alice': base_alice,
        'base_alice_nombre': "Base Z" if base_alice == 0 else "Base X",
        'estado_alice': estado_alice,
        'base_bob': base_bob,
        'base_bob_nombre': "Base Z" if base_bob == 0 else "Base X",
        'medicion_bob': medicion_bob,
        'exito': exito,
        'bit_deducido_bob': bit_deducido_bob,
        'espia_activo': espia_activo,
        'base_espia': base_espia,
        'base_espia_nombre': base_espia_nombre,
        'bit_medido_espia': bit_medido_espia,
        'color_alice': color_alice,
        'color_bob': color_bob,
    }

@app.route('/')
def index():
    return render_template('index_bb84.html')

@app.route('/simular', methods=['POST'])
def simular():
    data = request.json
    n_bits = data.get('n_bits', 16)
    espia_activo = data.get('espia_activo', False)
    
    resultados = []
    alice_key = []
    bob_key = []
    
    for i in range(n_bits):
        bit_alice = random.randint(0, 1)
        base_alice = random.randint(0, 1)
        base_bob = random.randint(0, 1)
        
        resultado = simular_con_espia(bit_alice, base_alice, base_bob, espia_activo)
        resultado['indice'] = i + 1
        resultados.append(resultado)
        
        if resultado['exito']:
            alice_key.append(resultado['bit_alice'])
            bob_key.append(resultado['bit_deducido_bob'])
    
    # --- DETECCIÓN DE ESPÍA POR SUBMUESTRA (protocolo BB84 real) ---
    if espia_activo and len(alice_key) > 0:
        # Tomamos una muestra aleatoria (máximo 10 bits, o la mitad si es más pequeña)
        tam_muestra = min(10, len(alice_key))
        indices_muestra = random.sample(range(len(alice_key)), tam_muestra)
        errores = sum(1 for i in indices_muestra if alice_key[i] != bob_key[i])
        espia_detectada = errores > 0
    else:
        espia_detectada = False
    
    password = generar_password(alice_key)
    clave_binaria = ''.join(str(b) for b in alice_key)
    tasa_exito = (len(alice_key)/n_bits)*100 if n_bits > 0 else 0
    
    return jsonify({
        'resultados': resultados,
        'alice_key': alice_key,
        'bob_key': bob_key,
        'coinciden': alice_key == bob_key,
        'longitud_clave': len(alice_key),
        'tasa_exito': f"{tasa_exito:.1f}%",
        'espia_activo': espia_activo,
        'espia_detectada': espia_detectada,
        'password': password,
        'clave_binaria': clave_binaria
    })

@app.route('/cifrar', methods=['POST'])
def cifrar_mensaje():
    data = request.json
    mensaje = data.get('mensaje', '')
    clave_binaria = data.get('clave_binaria', '')
    
    if not mensaje or not clave_binaria:
        return jsonify({'cifrado': mensaje})
    
    desplazamientos = []
    for i in range(0, len(clave_binaria), 3):
        grupo = clave_binaria[i:i+3]
        if len(grupo) == 3:
            desplazamientos.append(int(grupo, 2))
        else:
            desplazamientos.append(int(grupo.ljust(3, '0'), 2))
    
    resultado = []
    for idx, char in enumerate(mensaje):
        if char.isalpha():
            d = desplazamientos[idx % len(desplazamientos)]
            if char.isupper():
                nuevo = (ord(char) - ord('A') + d) % 26
                resultado.append(chr(ord('A') + nuevo))
            else:
                nuevo = (ord(char) - ord('a') + d) % 26
                resultado.append(chr(ord('a') + nuevo))
        else:
            resultado.append(char)
    
    return jsonify({'cifrado': ''.join(resultado)})

@app.route('/descifrar', methods=['POST'])
def descifrar_mensaje():
    data = request.json
    mensaje_cifrado = data.get('mensaje_cifrado', '')
    clave_binaria = data.get('clave_binaria', '')
    
    if not mensaje_cifrado or not clave_binaria:
        return jsonify({'descifrado': mensaje_cifrado})
    
    desplazamientos = []
    for i in range(0, len(clave_binaria), 3):
        grupo = clave_binaria[i:i+3]
        if len(grupo) == 3:
            desplazamientos.append(int(grupo, 2))
        else:
            desplazamientos.append(int(grupo.ljust(3, '0'), 2))
    
    resultado = []
    for idx, char in enumerate(mensaje_cifrado):
        if char.isalpha():
            d = desplazamientos[idx % len(desplazamientos)]
            if char.isupper():
                nuevo = (ord(char) - ord('A') - d) % 26
                resultado.append(chr(ord('A') + nuevo))
            else:
                nuevo = (ord(char) - ord('a') - d) % 26
                resultado.append(chr(ord('a') + nuevo))
        else:
            resultado.append(char)
    
    return jsonify({'descifrado': ''.join(resultado)})

def generar_password(key):
    if not key:
        return "No se generó clave"
    
    bits_str = ''.join(str(b) for b in key)
    chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
    
    password = ''
    for i in range(0, len(bits_str), 4):
        if len(password) >= 12:
            break
        grupo = bits_str[i:i+4]
        if len(grupo) == 4:
            idx = int(grupo, 2) % len(chars)
            password += chars[idx]
    
    return password if password else "Clave123"

if __name__ == '__main__':
    app.run(debug=True, port=8080)