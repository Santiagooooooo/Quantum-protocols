# Quantum Protocol Simulations

This repository contains three interactive Flask applications that simulate core ideas from quantum communication and quantum key distribution.

## Included Protocols

### BB84
`Protocolo BB84` simulates the BB84 quantum key distribution protocol. It shows how Alice and Bob choose random bases, compare compatible measurements, detect a possible eavesdropper, and derive a shared key that can be used for simple message encryption and decryption.

### BB92
`Protocolo BB92` simulates the BB92 protocol using non-orthogonal quantum states. The app illustrates how Bob can sometimes infer Alice's bit from his measurement result and then build a shared key from the successful rounds.

### EPR
`Protocolo EPR` simulates an entanglement-based protocol with EPR pairs. It includes Bell-type correlation checks, an optional eavesdropping scenario, and key-generation rounds based on shared entangled states.

## Tech Stack

- Python
- Flask
- Qiskit
- Qiskit Aer
- NumPy
- HTML, CSS, and JavaScript

## Project Structure

- `Protocolo BB84/`
- `Protocolo BB92/`
- `Protocolo EPR/`

Each folder contains its own Flask app, templates, and static assets.

## Running the Apps

Install the required dependencies first:

```bash
pip install flask qiskit qiskit-aer numpy
```

Then run any protocol app:

```bash
python "Protocolo BB84/app84.py"
python "Protocolo BB92/app.py"
python "Protocolo EPR/app.py"
```

After starting one of them, open the local Flask URL shown in the terminal, usually `http://127.0.0.1:5000`.


