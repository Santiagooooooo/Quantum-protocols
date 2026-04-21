let espiaActivo = false;
let claveBinariaActual = '';

document.getElementById('simular_btn').addEventListener('click', async () => {
    const n_bits = parseInt(document.getElementById('n_bits').value);
    espiaActivo = document.getElementById('espia_activo').checked;
    
    const btn = document.getElementById('simular_btn');
    btn.textContent = '⏳ Simulando...';
    btn.disabled = true;
    
    try {
        const response = await fetch('/simular', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ n_bits: n_bits, espia_activo: espiaActivo })
        });
        
        const data = await response.json();
        claveBinariaActual = data.clave_binaria;
        
        // Mostrar cuadrados
        mostrarCuadrados(data.resultados);
        mostrarDetalle(data.resultados);
        
        // Mostrar animación del camino en U (solo si espía activo)
        const caminoDiv = document.getElementById('camino_u');
        if (espiaActivo) {
            if (caminoDiv) caminoDiv.style.display = 'block';
            mostrarCableU(data.resultados);
        } else {
            if (caminoDiv) caminoDiv.style.display = 'none';
        }
        
        // Actualizar estadísticas
        document.getElementById('total_bits').textContent = data.resultados.length;
        document.getElementById('key_length').textContent = `${data.longitud_clave} bits`;
        document.getElementById('tasa_exito').textContent = data.tasa_exito;
        document.getElementById('password').textContent = data.password;
        document.getElementById('clave_binaria').textContent = data.clave_binaria;
        document.getElementById('alice_key').innerHTML = data.alice_key.join(' ') || '(vacío)';
        document.getElementById('bob_key').innerHTML = data.bob_key.join(' ') || '(vacío)';
        
        const claveDescifrado = document.getElementById('clave_descifrado');
        if (claveDescifrado) claveDescifrado.value = data.clave_binaria;
        
        // Mostrar secciones
        document.getElementById('cadena_bits').style.display = 'block';
        document.getElementById('resultados').style.display = 'block';
        document.getElementById('cifrado_section').style.display = 'block';
        document.getElementById('descifrado_section').style.display = 'block';
        document.getElementById('detalle').style.display = 'block';
        
        // Alerta de espía detectada
        if (data.espia_detectada) {
            const alerta = document.getElementById('alerta_espia');
            if (alerta) alerta.style.display = 'block';
            document.getElementById('espia_stat').style.display = 'block';
            const espiaDetectadaSpan = document.getElementById('espia_detectada');
            if (espiaDetectadaSpan) {
                espiaDetectadaSpan.innerHTML = '🚨 SÍ';
                espiaDetectadaSpan.style.color = '#f44336';
            }
            setTimeout(() => {
                if (alerta) alerta.style.opacity = '0';
                setTimeout(() => {
                    if (alerta) alerta.style.display = 'none';
                }, 500);
            }, 5000);
        } else if (data.espia_activo) {
            document.getElementById('espia_stat').style.display = 'block';
            const espiaDetectadaSpan = document.getElementById('espia_detectada');
            if (espiaDetectadaSpan) {
                espiaDetectadaSpan.innerHTML = '✅ NO';
                espiaDetectadaSpan.style.color = '#4caf50';
            }
        }
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error en la simulación: ' + error.message);
    } finally {
        btn.textContent = '🚀 Iniciar BB84';
        btn.disabled = false;
    }
});

function mostrarCuadrados(resultados) {
    const aliceContainer = document.getElementById('bits_alice');
    const bobContainer = document.getElementById('bits_bob');
    if (!aliceContainer || !bobContainer) return;
    
    aliceContainer.innerHTML = '';
    bobContainer.innerHTML = '';
    
    resultados.forEach((bit) => {
        // Alice
        const aliceDiv = document.createElement('div');
        aliceDiv.className = 'bit-cuadrado';
        aliceDiv.style.background = bit.color_alice;
        aliceDiv.innerHTML = `<div class="bit-valor">${bit.bit_alice}</div><div class="bit-label">${bit.estado_alice}</div>`;
        if (bit.exito) aliceDiv.style.boxShadow = '0 0 0 2px #4caf50';
        aliceContainer.appendChild(aliceDiv);
        
        // Bob
        const bobDiv = document.createElement('div');
        bobDiv.className = 'bit-cuadrado';
        bobDiv.style.background = bit.color_bob;
        bobDiv.innerHTML = `<div class="bit-valor">${bit.base_bob === 0 ? 'Z' : 'X'}</div><div class="bit-label">${bit.base_bob_nombre}</div>`;
        if (bit.exito) bobDiv.style.boxShadow = '0 0 0 2px #4caf50';
        bobContainer.appendChild(bobDiv);
    });
}

function mostrarCableU(resultados) {
    const caminoDiv = document.getElementById('camino_u');
    const espiaSvg = document.getElementById('espia_svg');
    const foton = document.getElementById('foton_animado');
    const espiaBitsDiv = document.getElementById('espia_bits');
    
    if (!caminoDiv) return;
    if (!espiaActivo) {
        caminoDiv.style.display = 'none';
        return;
    }
    
    caminoDiv.style.display = 'block';
    if (espiaSvg) espiaSvg.style.display = 'block';
    if (espiaBitsDiv) espiaBitsDiv.innerHTML = '';
    if (foton) {
        foton.style.display = 'none';
        foton.style.transition = '';
    }
    
    // Animar cada bit con retraso progresivo
    resultados.forEach((bit, idx) => {
        setTimeout(() => {
            if (!foton) return;
            // Mostrar fotón en posición inicial de Alice
            foton.style.display = 'flex';
            foton.style.background = bit.color_alice;
            foton.textContent = bit.estado_alice.replace(/[<>]/g, '');
            foton.style.left = '50px';
            foton.style.top = '20px';
            foton.style.transition = 'all 0.4s ease-in-out';
            
            // Bajar al nivel del espía
            setTimeout(() => {
                foton.style.left = '400px';
                foton.style.top = '140px';
                
                // Espía intercepta
                setTimeout(() => {
                    if (espiaBitsDiv) {
                        const espiaBit = document.createElement('div');
                        espiaBit.className = 'bit-cuadrado';
                        espiaBit.style.background = '#9c27b0';
                        espiaBit.style.width = '60px';
                        espiaBit.style.height = '60px';
                        espiaBit.innerHTML = `<div class="bit-valor">${bit.bit_medido_espia !== null ? bit.bit_medido_espia : '?'}</div><div class="bit-label">${bit.base_espia_nombre || '?'}</div>`;
                        espiaBitsDiv.appendChild(espiaBit);
                    }
                    
                    // Subir hacia Bob
                    setTimeout(() => {
                        foton.style.left = '600px';
                        foton.style.top = '140px';
                        
                        // Llegar a Bob
                        setTimeout(() => {
                            foton.style.left = '950px';
                            foton.style.top = '20px';
                            
                            // Ocultar fotón
                            setTimeout(() => {
                                foton.style.display = 'none';
                                foton.style.transition = '';
                            }, 400);
                        }, 400);
                    }, 600);
                }, 400);
            }, 100);
        }, idx * 2000);
    });
}

function mostrarDetalle(resultados) {
    const detalle = document.getElementById('detalle_bits');
    if (!detalle) return;
    detalle.innerHTML = '';
    
    resultados.forEach((bit) => {
        const div = document.createElement('div');
        let clase = bit.exito ? 'exito' : 'fallo';
        if (bit.espia_activo && bit.espia_detectada) clase = 'espia';
        div.className = `bit-item ${clase}`;
        
        let espiaHtml = '';
        if (bit.espia_activo) {
            espiaHtml = `<br>🕵️ ESPÍA: Midió en ${bit.base_espia_nombre || '?'} → Bit ${bit.bit_medido_espia}`;
            if (bit.espia_detectada) espiaHtml += ` <strong style="color:#9c27b0;">⚠️ ¡DETECTADA!</strong>`;
        }
        
        div.innerHTML = `<strong>Bit ${bit.indice}</strong><br>Alice: ${bit.bit_alice} (${bit.estado_alice}) - ${bit.base_alice_nombre}<br>Bob: ${bit.base_bob_nombre} → Midió: ${bit.medicion_bob}<br>${bit.exito ? `✅ Éxito! Bob deduce: ${bit.bit_deducido_bob} → Se agrega a la clave` : '❌ Descartado (bases diferentes)'}${espiaHtml}`;
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
const cifrarBtn = document.getElementById('cifrar_btn');
if (cifrarBtn) {
    cifrarBtn.addEventListener('click', async () => {
        const mensaje = document.getElementById('mensaje').value;
        if (!mensaje) { alert('Escribe un mensaje'); return; }
        if (!claveBinariaActual) { alert('Genera una clave primero'); return; }
        
        const btn = document.getElementById('cifrar_btn');
        btn.textContent = '⏳ Cifrando...';
        
        try {
            const response = await fetch('/cifrar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mensaje: mensaje, clave_binaria: claveBinariaActual })
            });
            const data = await response.json();
            document.getElementById('resultado_cifrado').style.display = 'block';
            document.getElementById('cifrado_msg').textContent = data.cifrado;
            document.getElementById('mensaje_cifrado').value = data.cifrado;
        } catch (error) {
            alert('Error al cifrar');
        } finally {
            btn.textContent = '🔒 Cifrar Mensaje';
        }
    });
}

// Copiar mensaje cifrado
const copyCifradoBtn = document.getElementById('copy_cifrado_btn');
if (copyCifradoBtn) {
    copyCifradoBtn.addEventListener('click', () => {
        const cifrado = document.getElementById('cifrado_msg').textContent;
        navigator.clipboard.writeText(cifrado);
        const btn = document.getElementById('copy_cifrado_btn');
        btn.textContent = '✅';
        setTimeout(() => btn.textContent = '📋', 2000);
    });
}

// Descifrar mensaje
const descifrarBtn = document.getElementById('descifrar_btn');
if (descifrarBtn) {
    descifrarBtn.addEventListener('click', async () => {
        const mensajeCifrado = document.getElementById('mensaje_cifrado').value;
        const claveDescifrado = document.getElementById('clave_descifrado').value;
        
        if (!mensajeCifrado) { alert('Pega un mensaje cifrado'); return; }
        if (!claveDescifrado) { alert('Ingresa la clave'); return; }
        
        const btn = document.getElementById('descifrar_btn');
        btn.textContent = '⏳ Descifrando...';
        
        try {
            const response = await fetch('/descifrar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mensaje_cifrado: mensajeCifrado, clave_binaria: claveDescifrado })
            });
            const data = await response.json();
            document.getElementById('resultado_descifrado').style.display = 'block';
            document.getElementById('descifrado_msg').textContent = data.descifrado;
        } catch (error) {
            alert('Error al descifrar');
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
        navigator.clipboard.writeText(descifrado);
        const btn = document.getElementById('copy_descifrado_btn');
        btn.textContent = '✅';
        setTimeout(() => btn.textContent = '📋', 2000);
    });
}
