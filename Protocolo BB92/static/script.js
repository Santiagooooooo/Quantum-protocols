let claveBinariaActual = '';

document.getElementById('simular_btn').addEventListener('click', async () => {
    const n_bits = parseInt(document.getElementById('n_bits').value);
    
    const btn = document.getElementById('simular_btn');
    btn.textContent = '⏳ Simulando...';
    btn.disabled = true;
    
    try {
        const response = await fetch('/simular', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ n_bits: n_bits })
        });
        
        const data = await response.json();
        
        claveBinariaActual = data.clave_binaria;
        
        mostrarCuadrados(data.resultados);
        
        document.getElementById('total_bits').textContent = data.resultados.length;
        document.getElementById('key_length').textContent = `${data.longitud_clave} bits`;
        document.getElementById('tasa_exito').textContent = data.tasa_exito;
        document.getElementById('password').textContent = data.password;
        document.getElementById('clave_binaria').textContent = data.clave_binaria;
        document.getElementById('alice_key').innerHTML = data.alice_key.join(' ') || '(vacío)';
        document.getElementById('bob_key').innerHTML = data.bob_key.join(' ') || '(vacío)';
        
        // Auto-llenar el campo de clave para descifrado
        const claveDescifradoInput = document.getElementById('clave_descifrado');
        if (claveDescifradoInput) {
            claveDescifradoInput.value = data.clave_binaria;
        }
        
        mostrarDetalle(data.resultados);
        
        document.getElementById('cadena_bits').style.display = 'block';
        document.getElementById('resultados').style.display = 'block';
        document.getElementById('cifrado_section').style.display = 'block';
        
        const descifradoSection = document.getElementById('descifrado_section');
        if (descifradoSection) {
            descifradoSection.style.display = 'block';
        }
        
        document.getElementById('detalle').style.display = 'block';
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error en la simulación');
    } finally {
        btn.textContent = '🚀 Iniciar Simulación';
        btn.disabled = false;
    }
});

function mostrarCuadrados(resultados) {
    const aliceContainer = document.getElementById('bits_alice');
    const bobContainer = document.getElementById('bits_bob');
    
    aliceContainer.innerHTML = '';
    bobContainer.innerHTML = '';
    
    resultados.forEach((bit) => {
        // Cuadrado de Alice
        const aliceDiv = document.createElement('div');
        aliceDiv.className = 'bit-cuadrado';
        aliceDiv.style.background = bit.color_alice;
        aliceDiv.innerHTML = `
            <div class="bit-valor">${bit.bit_alice}</div>
            <div class="bit-label">${bit.estado_alice}</div>
        `;
        if (bit.exito) aliceDiv.style.boxShadow = '0 0 0 2px #4caf50';
        aliceContainer.appendChild(aliceDiv);
        
        // Cuadrado de Bob
        const bobDiv = document.createElement('div');
        bobDiv.className = 'bit-cuadrado';
        bobDiv.style.background = bit.color_bob;
        bobDiv.innerHTML = `
            <div class="bit-valor">${bit.base_bob === 0 ? 'Z' : 'X'}</div>
            <div class="bit-label">${bit.base_nombre.split(' ')[1] || bit.base_nombre}</div>
        `;
        if (bit.exito) bobDiv.style.boxShadow = '0 0 0 2px #4caf50';
        bobContainer.appendChild(bobDiv);
    });
}

function mostrarDetalle(resultados) {
    const detalle = document.getElementById('detalle_bits');
    detalle.innerHTML = '';
    
    resultados.forEach((bit) => {
        const div = document.createElement('div');
        div.className = `bit-item ${bit.exito ? 'exito' : 'fallo'}`;
        div.innerHTML = `
            <strong>Bit ${bit.indice}</strong><br>
            Alice: ${bit.bit_alice} (${bit.estado_alice}) - ${bit.puerta_alice}<br>
            Bob: ${bit.base_nombre}<br>
            Medición: ${bit.medicion}<br>
            ${bit.exito ? `✅ ÉXITO! Bob deduce: ${bit.bit_deducido} → Se agrega a la clave` : '❌ Descartado (medición 0)'}
        `;
        detalle.appendChild(div);
    });
}

// Copiar contraseña
document.getElementById('copy_btn').addEventListener('click', () => {
    const password = document.getElementById('password').textContent;
    navigator.clipboard.writeText(password).then(() => {
        const btn = document.getElementById('copy_btn');
        btn.textContent = '✅ Copiado!';
        setTimeout(() => btn.textContent = '📋 Copiar', 2000);
    });
});

// Copiar clave binaria
const copyClaveBtn = document.getElementById('copy_clave_btn');
if (copyClaveBtn) {
    copyClaveBtn.addEventListener('click', () => {
        const clave = document.getElementById('clave_binaria').textContent;
        navigator.clipboard.writeText(clave).then(() => {
            const btn = document.getElementById('copy_clave_btn');
            btn.textContent = '✅ Copiado!';
            setTimeout(() => btn.textContent = '📋 Copiar clave', 2000);
        });
    });
}

// Cifrar mensaje
document.getElementById('cifrar_btn').addEventListener('click', async () => {
    const mensaje = document.getElementById('mensaje').value;
    
    if (!mensaje) {
        alert('Escribe un mensaje para cifrar');
        return;
    }
    
    if (!claveBinariaActual) {
        alert('Primero genera una clave cuántica');
        return;
    }
    
    const btn = document.getElementById('cifrar_btn');
    btn.textContent = '⏳ Cifrando...';
    
    try {
        const response = await fetch('/cifrar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mensaje: mensaje,
                clave_binaria: claveBinariaActual
            })
        });
        
        const data = await response.json();
        
        document.getElementById('resultado_cifrado').style.display = 'block';
        document.getElementById('cifrado_msg').textContent = data.cifrado;
        
        // Auto-llenar el campo de mensaje cifrado para descifrar
        const mensajeCifradoInput = document.getElementById('mensaje_cifrado');
        if (mensajeCifradoInput) {
            mensajeCifradoInput.value = data.cifrado;
        }
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cifrar');
    } finally {
        btn.textContent = '🔒 Cifrar Mensaje';
    }
});

// Copiar mensaje cifrado
const copyCifradoBtn = document.getElementById('copy_cifrado_btn');
if (copyCifradoBtn) {
    copyCifradoBtn.addEventListener('click', () => {
        const cifrado = document.getElementById('cifrado_msg').textContent;
        navigator.clipboard.writeText(cifrado).then(() => {
            const btn = document.getElementById('copy_cifrado_btn');
            btn.textContent = '✅';
            setTimeout(() => btn.textContent = '📋', 2000);
        });
    });
}

// ============================================
// NUEVA SECCIÓN: DESCIFRAR MENSAJE
// ============================================

// Descifrar mensaje
const descifrarBtn = document.getElementById('descifrar_btn');
if (descifrarBtn) {
    descifrarBtn.addEventListener('click', async () => {
        const mensajeCifrado = document.getElementById('mensaje_cifrado').value;
        const claveDescifrado = document.getElementById('clave_descifrado').value;
        
        if (!mensajeCifrado) {
            alert('Pega un mensaje cifrado para descifrar');
            return;
        }
        
        if (!claveDescifrado) {
            alert('Ingresa la clave binaria para descifrar');
            return;
        }
        
        const btn = document.getElementById('descifrar_btn');
        btn.textContent = '⏳ Descifrando...';
        
        try {
            const response = await fetch('/descifrar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mensaje_cifrado: mensajeCifrado,
                    clave_binaria: claveDescifrado
                })
            });
            
            const data = await response.json();
            
            document.getElementById('resultado_descifrado').style.display = 'block';
            document.getElementById('descifrado_msg').textContent = data.descifrado;
            
        } catch (error) {
            console.error('Error:', error);
            alert('Error al descifrar. Verifica que la clave sea correcta');
        } finally {
            btn.textContent = '🔓 Descifrar';
        }
    });
}

// Copiar mensaje descifrado
const copyDescifradoBtn = document.getElementById('copy_descifrado_btn');
if (copyDescifradoBtn) {
    copyDescifradoBtn.addEventListener('click', () => {
        const descifrado = document.getElementById('descifrado_msg').textContent;
        navigator.clipboard.writeText(descifrado).then(() => {
            const btn = document.getElementById('copy_descifrado_btn');
            btn.textContent = '✅';
            setTimeout(() => btn.textContent = '📋', 2000);
        });
    });
}