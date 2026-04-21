from flask import Flask, render_template, request, jsonify
from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator
from qiskit import transpile
import random

app = Flask(__name__)

def simular_bit_bb92(bit_alice, base_bob=None):
    """Simula un bit del protocolo BB92 con la lógica correcta"""
    if base_bob is None:
        base_bob = random.randint(0, 1)
    
    estado_alice = "|0⟩" if bit_alice == 0 else "|+⟩"
    puerta_alice = "Ninguna" if bit_alice == 0 else "Hadamard (H)"
    
    qc = QuantumCircuit(1, 1)
    
    if bit_alice == 1:
        qc.h(0)
    
    base_nombre = "Base Z (|0⟩/|1⟩)" if base_bob == 0 else "Base X (|+⟩/|-⟩)"
    if base_bob == 1:
        qc.h(0)
    
    qc.measure(0, 0)
    
    backend = AerSimulator()
    compiled_circuit = transpile(qc, backend)
    resultado = backend.run(compiled_circuit, shots=1).result()
    medicion = int(list(resultado.get_counts().keys())[0])
    
    exito = (medicion == 1)
    bit_deducido = 1 - base_bob if exito else None
    
    color_alice = '#ff4444' if bit_alice == 1 else '#4CAF50'
    color_bob = '#2196F3' if base_bob == 0 else '#FF9800'
    
    return {
        'indice': 0,
        'bit_alice': bit_alice,
        'estado_alice': estado_alice,
        'puerta_alice': puerta_alice,
        'base_bob': base_bob,
        'base_nombre': base_nombre,
        'medicion': medicion,
        'exito': exito,
        'bit_deducido': bit_deducido,
        'color_alice': color_alice,
        'color_bob': color_bob,
        'explicacion': f"Alice envió {bit_alice} ({estado_alice}), Bob usó {base_nombre}, midió {medicion}. {'✅ Éxito! Bob deduce ' + str(bit_deducido) if exito else '❌ Descartado'}"
    }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/simular', methods=['POST'])
def simular():
    data = request.json
    n_bits = data.get('n_bits', 10)
    
    resultados = []
    alice_key = []
    bob_key = []
    
    for i in range(n_bits):
        bit_alice = random.randint(0, 1)
        base_bob = random.randint(0, 1)
        resultado = simular_bit_bb92(bit_alice, base_bob)
        resultado['indice'] = i + 1
        resultados.append(resultado)
        
        if resultado['exito']:
            alice_key.append(resultado['bit_alice'])
            bob_key.append(resultado['bit_deducido'])
    
    # Generar contraseña a partir de la clave
    password = generar_password(alice_key)
    
    # Convertir clave a string binario para cifrado
    clave_binaria = ''.join(str(b) for b in alice_key)
    
    return jsonify({
        'resultados': resultados,
        'alice_key': alice_key,
        'bob_key': bob_key,
        'coinciden': alice_key == bob_key,
        'longitud_clave': len(alice_key),
        'tasa_exito': f"{(len(alice_key)/n_bits)*100:.1f}%",
        'password': password,
        'clave_binaria': clave_binaria
    })

@app.route('/cifrar', methods=['POST'])
def cifrar_mensaje():
    """Cifra un mensaje usando la clave cuántica"""
    data = request.json
    mensaje = data.get('mensaje', '')
    clave_binaria = data.get('clave_binaria', '')
    
    if not mensaje or not clave_binaria:
        return jsonify({'error': 'Faltan mensaje o clave'})
    
    resultado_cifrado = cifrar_con_clave(mensaje, clave_binaria)
    return jsonify(resultado_cifrado)

@app.route('/descifrar', methods=['POST'])
def descifrar_mensaje():
    """Descifra un mensaje usando la clave cuántica"""
    data = request.json
    mensaje_cifrado = data.get('mensaje_cifrado', '')
    clave_binaria = data.get('clave_binaria', '')
    
    if not mensaje_cifrado or not clave_binaria:
        return jsonify({'error': 'Faltan mensaje cifrado o clave'})
    
    resultado_descifrado = descifrar_con_clave(mensaje_cifrado, clave_binaria)
    return jsonify(resultado_descifrado)

def cifrar_con_clave(mensaje, clave_binaria):
    """Cifra un mensaje usando desplazamiento basado en la clave binaria"""
    # Convertir clave binaria a desplazamientos (0-7)
    desplazamientos = []
    for i in range(0, len(clave_binaria), 3):
        grupo = clave_binaria[i:i+3]
        if len(grupo) == 3:
            desplazamiento = int(grupo, 2)
        else:
            desplazamiento = int(grupo.ljust(3, '0'), 2)
        desplazamientos.append(desplazamiento)
    
    # Cifrar cada carácter
    mensaje_cifrado = []
    proceso = []
    
    for idx, char in enumerate(mensaje):
        if char.isalpha():
            desplazamiento = desplazamientos[idx % len(desplazamientos)]
            
            if char.isupper():
                base = ord('A')
                nuevo = (ord(char) - base + desplazamiento) % 26
                char_cifrado = chr(base + nuevo)
            else:
                base = ord('a')
                nuevo = (ord(char) - base + desplazamiento) % 26
                char_cifrado = chr(base + nuevo)
            
            mensaje_cifrado.append(char_cifrado)
            proceso.append({
                'original': char,
                'desplazamiento': desplazamiento,
                'cifrado': char_cifrado
            })
        else:
            mensaje_cifrado.append(char)
            proceso.append({
                'original': char,
                'desplazamiento': 0,
                'cifrado': char,
                'nota': 'Carácter no alfabético'
            })
    
    return {
        'original': mensaje,
        'cifrado': ''.join(mensaje_cifrado),
        'proceso': proceso,
        'clave_usada': clave_binaria
    }

def descifrar_con_clave(mensaje_cifrado, clave_binaria):
    """Descifra un mensaje usando la clave binaria"""
    # Convertir clave binaria a desplazamientos (0-7)
    desplazamientos = []
    for i in range(0, len(clave_binaria), 3):
        grupo = clave_binaria[i:i+3]
        if len(grupo) == 3:
            desplazamiento = int(grupo, 2)
        else:
            desplazamiento = int(grupo.ljust(3, '0'), 2)
        desplazamientos.append(desplazamiento)
    
    # Descifrar cada carácter
    mensaje_descifrado = []
    proceso = []
    
    for idx, char in enumerate(mensaje_cifrado):
        if char.isalpha():
            desplazamiento = desplazamientos[idx % len(desplazamientos)]
            
            if char.isupper():
                base = ord('A')
                nuevo = (ord(char) - base - desplazamiento) % 26
                char_descifrado = chr(base + nuevo)
            else:
                base = ord('a')
                nuevo = (ord(char) - base - desplazamiento) % 26
                char_descifrado = chr(base + nuevo)
            
            mensaje_descifrado.append(char_descifrado)
            proceso.append({
                'cifrado': char,
                'desplazamiento': desplazamiento,
                'descifrado': char_descifrado
            })
        else:
            mensaje_descifrado.append(char)
            proceso.append({
                'cifrado': char,
                'desplazamiento': 0,
                'descifrado': char,
                'nota': 'Carácter no alfabético'
            })
    
    return {
        'cifrado': mensaje_cifrado,
        'descifrado': ''.join(mensaje_descifrado),
        'proceso': proceso,
        'clave_usada': clave_binaria
    }

def generar_password(key):
    """Convierte la clave binaria en una contraseña legible"""
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
    
    return password if password else "Clave muy corta (usa más bits)"

if __name__ == '__main__':
    app.run(debug=True)