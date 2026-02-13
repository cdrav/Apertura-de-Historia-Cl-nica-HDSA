document.addEventListener('DOMContentLoaded', function() {
    // URL DEL SCRIPT DE GOOGLE (Global)
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzdE5qkog5Fs3vu4H4J8r5f-o7W_EWMzOQsC0mj_RCkK6cfhpYKcO-S1yfFLcQZArGmQQ/exec"; 
    
    let datosGlobales = []; // Para guardar los datos descargados
    let filaSeleccionada = null; // Para saber qué fila estamos editando

    // 1. Poner fecha actual automáticamente
    const fechaInput = document.getElementById('fechaSolicitud');
    // Ajuste: Usar hora local para evitar que marque "mañana" si es tarde en la noche
    const now = new Date();
    const hoy = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    fechaInput.value = hoy;

    // 1.1 Validación Condicional: Admisión vs Fecha de Atención
    const inputAdmision = document.querySelector('input[name="numero_admision"]');
    const inputFechaAtencion = document.querySelector('input[name="fecha_atencion_paciente"]');

    function validarRequeridos() {
        const tieneAdmision = inputAdmision.value.trim() !== '';
        const tieneFecha = inputFechaAtencion.value !== '';

        inputAdmision.required = !tieneFecha;
        inputFechaAtencion.required = !tieneAdmision;
    }

    inputAdmision.addEventListener('input', validarRequeridos);
    inputFechaAtencion.addEventListener('input', validarRequeridos);

    // 2. Manejo del Formulario
    const form = document.getElementById('aperturaForm');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Mostrar cargando
        Swal.fire({
            title: 'Procesando...',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });
        
        // Recopilar datos
        const formData = new FormData(form);
        const data = {};
        data.action = 'create'; // Importante: Indicar que es una creación
        formData.forEach((value, key) => data[key] = value);

        fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(result => {
            if(result.result === 'success'){
                Swal.fire('¡Enviado!', 'Solicitud generada correctamente', 'success');
                agregarFilaDemo(data); // Pasamos los datos antes de borrar el formulario
                form.reset();
                fechaInput.value = hoy;
            } else {
                throw new Error(result.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            Swal.fire('Error', 'No se pudo guardar la solicitud. Verifique su conexión.', 'error');
        });
    });

    // 3. Lógica de Acceso a Gestión (Simulado)
    const btnAdmin = document.getElementById('btnAccesoAdmin');
    const moduloGestion = document.getElementById('moduloGestion');
    const panelSeguimiento = document.getElementById('panelSeguimiento');
    const btnCerrarTabla = document.getElementById('btnCerrarTabla');
    
    // Elementos de filtro
    const containerFiltros = document.getElementById('containerFiltros');
    const filtroEstado = document.getElementById('filtroEstado');
    const filtroFecha = document.getElementById('filtroFecha');

    btnAdmin.addEventListener('click', async () => {
        const { value: password } = await Swal.fire({
            title: 'Acceso Administrativo',
            input: 'password',
            inputLabel: 'Ingrese su clave asignada',
            inputPlaceholder: 'Clave de acceso',
            confirmButtonText: 'Validar',
            showCancelButton: true
        });

        if (!password) return;

        // Lógica de Roles
        if (password === 'Hdsahc26*') {
            // ROL: SOPORTE (Gilberto, Victor, Julian)
            activarModoGestion('soporte');
            cargarDatosDesdeGoogle('soporte');
        } else if (password === 'Hdsa891900') {
            // ROL: ADMIN (Robert)
            activarModoGestion('admin');
            cargarDatosDesdeGoogle('admin');
        } else {
            Swal.fire('Error', 'Clave incorrecta', 'error');
        }
    });

    function activarModoGestion(rol) {
        moduloGestion.classList.remove('d-none');
        panelSeguimiento.classList.remove('d-none');

        // Lógica dinámica para el select "Gestionado Por"
        const selectGestion = document.getElementById('gestionadoPor');
        selectGestion.innerHTML = '<option value="" selected>Seleccione...</option>';
        
        const usuariosBase = ["Gilberto Taborda", "Victor Rengifo", "Julian Velez"];
        // Si es admin, solo Robert. Si no, los de soporte.
        const usuarios = (rol === 'admin') ? ["Robert Giraldo"] : usuariosBase;

        usuarios.forEach(user => {
            const opt = document.createElement('option');
            opt.value = user;
            opt.textContent = user;
            selectGestion.appendChild(opt);
        });

        if (rol === 'soporte') {
            // Ocultar filtros y forzar vista de pendientes
            containerFiltros.classList.add('d-none');
            aplicarFiltrosTabla('Pendiente', '');
        } else if (rol === 'admin') {
            // Mostrar filtros y resetear vista
            containerFiltros.classList.remove('d-none');
            filtroEstado.value = 'Todos';
            filtroFecha.value = '';
            aplicarFiltrosTabla('Todos', '');
        }
    }

    function cargarDatosDesdeGoogle(rol, silent = false) {
        if (!silent) {
            Swal.fire({
                title: 'Cargando solicitudes...',
                text: 'Obteniendo datos ',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });
        }

        fetch(SCRIPT_URL)
        .then(response => response.json())
        .then(data => {
            if (!silent) Swal.close();
            renderizarTabla(data);
            
            if (rol === 'soporte') {
                if (!silent) Swal.fire('Bienvenido Soporte', 'Visualizando solo pendientes', 'success');
                aplicarFiltrosTabla('Pendiente', '');
            } else {
                if (!silent) Swal.fire('Bienvenido Robert', 'Acceso total concedido', 'success');
                aplicarFiltrosTabla('Todos', '');
            }
        })
        .catch(error => {
            console.error(error);
            Swal.fire('Error', 'No se pudieron cargar los datos', 'error');
        });
    }

    function renderizarTabla(datos) {
        datosGlobales = datos; // Guardamos los datos en memoria
        const tbody = document.getElementById('tablaCuerpo');
        tbody.innerHTML = ''; // Limpiar tabla

        datos.forEach((item, index) => {
            // Determinar color badge
            let badgeClass = 'bg-warning text-dark';
            if(item.estado === 'Realizado') badgeClass = 'bg-success';
            if(item.estado === 'Rechazado') badgeClass = 'bg-danger';

            const row = `
                <tr onclick="cargarSolicitudParaGestion(${index})" style="cursor: pointer;" title="Clic para gestionar">
                    <td>${item.fecha_solicitud}</td>
                    <td>${item.paciente_nombre} (${item.paciente_id})</td>
                    <td>${item.admision || item.numero_admision}</td>
                    <td>${item.solicitante}</td>
                    <td>${item.profesional || item.profesional_responsable}</td>
                    <td><span class="badge ${badgeClass}">${item.estado}</span></td>
                    <td>${item.gestionado_por || '-'}</td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', row);
        });
    }

    function aplicarFiltrosTabla(estado, fecha) {
        const filas = document.querySelectorAll('#tablaCuerpo tr');
        filas.forEach(fila => {
            const celdaEstado = fila.querySelector('td:nth-child(6)').textContent.trim(); // Columna Estado
            const celdaFecha = fila.querySelector('td:nth-child(1)').textContent.trim();  // Columna Fecha

            const coincideEstado = (estado === 'Todos') || (celdaEstado.includes(estado));
            const coincideFecha = (fecha === '') || (celdaFecha === fecha);

            fila.style.display = (coincideEstado && coincideFecha) ? '' : 'none';
        });
    }

    // Event Listeners para los filtros (Solo funcionan si están visibles/Admin)
    filtroEstado.addEventListener('change', () => {
        aplicarFiltrosTabla(filtroEstado.value, filtroFecha.value);
    });
    filtroFecha.addEventListener('change', () => {
        aplicarFiltrosTabla(filtroEstado.value, filtroFecha.value);
    });

    btnCerrarTabla.addEventListener('click', () => {
        panelSeguimiento.classList.add('d-none');
        moduloGestion.classList.add('d-none');
    });

    // Función auxiliar para demo de tabla
    function agregarFilaDemo(data) {
        const tbody = document.getElementById('tablaCuerpo');
        
        const row = `
            <tr>
                <td>${data.fecha_solicitud}</td>
                <td>${data.paciente_nombre} (${data.paciente_id})</td>
                <td>${data.numero_admision}</td>
                <td>${data.solicitante}</td>
                <td>${data.profesional_responsable}</td>
                <td><span class="badge bg-warning text-dark">Pendiente</span></td>
                <td>-</td>
            </tr>
        `;
        tbody.insertAdjacentHTML('afterbegin', row);
    }

    // 4. Lógica para Cargar Datos en Formulario (Edición)
    window.cargarSolicitudParaGestion = function(index) {
        const data = datosGlobales[index];
        filaSeleccionada = data.fila; // Obtenemos el ID de fila real del Sheet

        // Llenar campos del formulario principal (Solo lectura visual)
        document.querySelector('[name="fecha_solicitud"]').value = data.fecha_solicitud;
        document.querySelector('[name="solicitante"]').value = data.solicitante;
        document.querySelector('[name="profesional_responsable"]').value = data.profesional || data.profesional_responsable;
        document.querySelector('[name="paciente_id"]').value = data.paciente_id;
        document.querySelector('[name="paciente_nombre"]').value = data.paciente_nombre;
        document.querySelector('[name="numero_admision"]').value = data.admision || data.numero_admision;
        document.querySelector('[name="fecha_atencion_paciente"]').value = data.fecha_atencion_paciente;
        document.querySelector('[name="descripcion"]').value = data.descripcion;

        // Mostrar módulo de gestión si no está visible (para admins)
        if(moduloGestion.classList.contains('d-none')) {
            Swal.fire('Modo Visualización', 'Para editar, inicie sesión como Admin/Soporte', 'info');
        } else {
            // Scroll hacia el módulo de gestión
            moduloGestion.scrollIntoView({behavior: 'smooth'});
            Swal.fire({
                icon: 'success',
                title: 'Solicitud Cargada',
                text: 'Puede proceder a gestionar la solicitud abajo.',
                timer: 1500,
                showConfirmButton: false
            });
        }
    };

    // 5. Botón Guardar Gestión
    document.getElementById('btnGuardarGestion').addEventListener('click', function() {
        if (!filaSeleccionada) {
            Swal.fire('Error', 'No hay ninguna solicitud seleccionada', 'error');
            return;
        }

        const payload = {
            action: 'update',
            fila: filaSeleccionada,
            estado: document.getElementById('estadoSolicitud').value,
            gestionado_por: document.getElementById('gestionadoPor').value,
            fecha_gestion: document.getElementById('fechaAtencion').value,
            observaciones: document.getElementById('observacionesGestion').value
        };

        Swal.fire({title: 'Actualizando...', didOpen: () => Swal.showLoading()});

        fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        })
        .then(r => r.json())
        .then(data => {
            if(data.result === 'success') {
                Swal.fire('¡Actualizado!', 'Solicitud actualizada correctamente', 'success');
                // Recargar tabla para ver cambios
                // Detectar rol actual (simple check)
                const rol = document.getElementById('containerFiltros').classList.contains('d-none') ? 'soporte' : 'admin';
                cargarDatosDesdeGoogle(rol, true); // true para modo silencioso (sin mensaje de bienvenida)
                
                // Limpiar formulario
                document.getElementById('aperturaForm').reset();
                filaSeleccionada = null;
            } else {
                throw new Error(data.error);
            }
        })
        .catch(e => Swal.fire('Error', 'No se pudo actualizar: ' + e, 'error'));
    });
});