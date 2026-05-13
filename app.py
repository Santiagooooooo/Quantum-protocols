from flask import Flask, render_template, request, jsonify
import random
import numpy as np
from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator

app = Flask(__name__)
BELL_THRESHOLD = 2.0

def simulate_epr(total_pairs=1000, test_pairs=200, eve_probability=0.0, seed=None):
    if seed is not None:
        random.seed(seed)
        np.random.seed(seed)

    counts = {
        'ZZ': {'same': 0, 'total': 0},
        'XX': {'same': 0, 'total': 0},
        'ZX': {'same': 0, 'total': 0},
        'XZ': {'same': 0, 'total': 0}
    }
    meas_rows = []
    simulator = AerSimulator()

    for i in range(test_pairs):
        alice_base = random.choice(['Z', 'X'])
        bob_base = random.choice(['Z', 'X'])

        qc = QuantumCircuit(2, 2)
        qc.h(0)
        qc.cx(0, 1)

        eve_intercepted = (random.random() < eve_probability) if eve_probability > 0 else False
        if eve_intercepted:
            eve_base = random.choice(['Z', 'X'])
            if eve_base == 'X':
                qc.h(0)
            qc.measure(0, 0)
            # Usar if_test (Qiskit 1.0+)
            with qc.if_test((0, 1)):
                qc.x(0)
            if eve_base == 'X':
                qc.h(0)

        if alice_base == 'X':
            qc.h(0)
        if bob_base == 'X':
            qc.h(1)

        qc.measure([0, 1], [0, 1])

        qc_t = transpile(qc, simulator)
        job = simulator.run(qc_t, shots=1)
        result = job.result()
        counts_shot = result.get_counts()
        measured = list(counts_shot.keys())[0]
        alice_res = int(measured[0])
        bob_res = int(measured[1])
        same = (alice_res == bob_res)

        key = alice_base + bob_base
        counts[key]['total'] += 1
        if same:
            counts[key]['same'] += 1

        eve_error_flag = (eve_intercepted and alice_base == bob_base and not same)

        meas_rows.append({
            'pair': i+1,
            'alice_base': alice_base,
            'bob_base': bob_base,
            'alice_res': alice_res,
            'bob_res': bob_res,
            'same': same,
            'same_base': (alice_base == bob_base),
            'eve_error': eve_error_flag
        })

    E = {}
    for k, v in counts.items():
        E[k] = v['same'] / v['total'] if v['total'] > 0 else 0.5
    ep = {k: round(2*E[k] - 1, 4) for k in E}
    S = ep['ZZ'] + ep['XX'] - ep['ZX'] - ep['XZ']
    safe = S > BELL_THRESHOLD

    # No se generan bits de clave aquí, solo se informa cuántos pares están disponibles
    return {
        'E': {k: round(v, 4) for k, v in E.items()},
        'E_products': ep,
        'S': round(S, 4),
        'safe': safe,
        'threshold': BELL_THRESHOLD,
        'key_bits': [],   # vacío por ahora
        'key_length': 0,
        'meas_rows': meas_rows,
        'test_pairs': test_pairs,
        'key_pairs': total_pairs - test_pairs,
        'key_pairs_available': total_pairs - test_pairs,
        'eve_active': eve_probability > 0,
        'eve_errors': sum(1 for r in meas_rows if r['eve_error']),
        'same_base_count': sum(1 for r in meas_rows if r['same_base'])
    }

def simulate_key_pairs(key_pairs, base, eve_probability=0.0, seed=None):
    """Simula la medición de key_pairs pares EPR en la base dada (Z o X)"""
    if seed is not None:
        random.seed(seed)
        np.random.seed(seed)
    simulator = AerSimulator()
    key_bits = []
    for _ in range(key_pairs):
        qc = QuantumCircuit(2, 1)   # solo Alice
        qc.h(0)
        qc.cx(0, 1)
        if base == 'X':
            qc.h(0)
            qc.h(1)
        qc.measure(0, 0)
        qc_t = transpile(qc, simulator)
        job = simulator.run(qc_t, shots=1)
        result = job.result()
        counts = result.get_counts()
        bit = int(list(counts.keys())[0])
        # Simular posible intervención de Eve en la generación de clave (opcional)
        # if random.random() < eve_probability:
        #     bit = 1 - bit   # Eve introduce error si quiere, pero en teoría no debería porque ya pasó test
        key_bits.append(bit)
    return key_bits

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/simulate', methods=['POST'])
def simulate():
    data = request.get_json()
    total_pairs = int(data.get('total_pairs', 1000))
    test_pairs = int(data.get('test_pairs', 200))
    eve_probability = float(data.get('eve_probability', 0.0))
    seed = data.get('seed', None)
    if seed:
        seed = int(seed)
    res = simulate_epr(total_pairs, test_pairs, eve_probability, seed)
    return jsonify(res)

@app.route('/generate_key', methods=['POST'])
def generate_key():
    data = request.get_json()
    key_pairs = int(data.get('key_pairs', 0))
    base = data.get('base', 'Z')
    eve_probability = float(data.get('eve_probability', 0.0))
    seed = data.get('seed', None)
    if seed:
        seed = int(seed)
    bits = simulate_key_pairs(key_pairs, base, eve_probability, seed)
    return jsonify({'key_bits': bits, 'key_length': len(bits)})

if __name__ == '__main__':
    app.run(debug=True)