var truckIcon = L.icon({
    iconUrl: '/camion1_.png', 
    iconSize: [40, 40],  // Tamaño del ícono
    iconAnchor: [20, 20],  // Punto del ícono que corresponderá a la coordenada del marcador
    popupAnchor: [0, -20]  // Dónde se mostrará el popup en relación al ícono
});

var truckIcon2 = L.icon({
    iconUrl: '/camion2__.png', 
    iconSize: [40, 40],  // Tamaño del ícono
    iconAnchor: [20, 20],  // Punto del ícono que corresponderá a la coordenada del marcador
    popupAnchor: [0, -20]  // Dónde se mostrará el popup en relación al ícono
});
let markers= []
let markers2 = []
let trayectos = []; // Almacena las polilíneas de cada trayecto
let trayectos2 = [];
let rutaActual;
let rutaActual2;
let decoradores = [];
let decoradores2 = []; // Almacena las instancias de los decoradores de flechas
let rpmGaugeHistoric;
let marcadorDeslizable1 = null;
let marcadorDeslizable2 = null;

document.addEventListener('DOMContentLoaded', () => {
    const myMap = L.map('mapid').setView([11.02115114, -74.84057200], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(myMap);

    // Inicializar el tacómetro
    rpmGaugeHistoric = new Gauge(document.getElementById("rpmGaugeMap")).setOptions({
        angle: 0.20, 
        lineWidth: 0.20,
        radiusScale: 1,
        pointer: {
            length: 0.5, // Relativo al radio del gauge
            strokeWidth: 0.035, // El grosor del puntero
            color: '#000000' // Color del puntero
        },
        limitMax: false, 
        limitMin: false, 
        colorStart: '#FFC107', 
        colorStop: '#FFC107', 
        strokeColor: '#E0E0E0', 
        generateGradient: true,
        highDpiSupport: true,
        staticLabels: {
            font: "14px sans-serif", 
            labels: [0, 2000, 4000, 6000, 8000], 
            color: "#000000", 
            fractionDigits: 0 
        },
        staticZones: [
            {strokeStyle: "#F03E3E", min: 0, max: 2000}, 
            {strokeStyle: "#3498DB", min: 2000, max: 4000}, 
            {strokeStyle: "#2980B9", min: 4000, max: 6000},
            {strokeStyle: "#30B32D", min: 6000, max: 8000} 
        ],
    });
    rpmGaugeHistoric.maxValue = 8000; // valor máximo del tacómetro
    rpmGaugeHistoric.setMinValue(0);  // valor mínimo del tacómetro
    rpmGaugeHistoric.set(0); // Establece un valor inicial
    console.log("rpmGaugeHistoric inicializado:", rpmGaugeHistoric);

    document.getElementById("vehicleSelector").addEventListener("change", () => {
        limpiarMapa();  // Limpia el mapa cada vez que se cambia la selección del vehículo
        const vehiculoSeleccionado = document.getElementById("vehicleSelector").value;
        const startDateTime = document.getElementById('startDateTime').value;
        const endDateTime = document.getElementById('endDateTime').value;
    
        if (vehiculoSeleccionado === 'vehiculo1' && startDateTime && endDateTime) {
            cargarDatos2(startDateTime, endDateTime, myMap);
        } else if (vehiculoSeleccionado === 'vehiculo2' && startDateTime && endDateTime) {
            cargarDatos(startDateTime, endDateTime, myMap);
        } else if (vehiculoSeleccionado === 'vehiculos' && startDateTime && endDateTime) {
            cargarAmbosDatos(startDateTime, endDateTime, myMap);
        }
    });

    document.getElementById('submitButton').addEventListener('click', (event) => {
        event.preventDefault(); // Previene la acción por defecto del formulario
        const startDateTime = document.getElementById('startDateTime').value;
        const endDateTime = document.getElementById('endDateTime').value;
    
        // Actualiza y muestra la fecha y hora seleccionadas
        updateDateTimeDisplay(startDateTime, endDateTime);
    
        // Decidir qué función llamar basándose en el vehículo seleccionado
        const vehiculoSeleccionado = document.getElementById('vehicleSelector').value;
        if (vehiculoSeleccionado === 'vehiculo1') {
            cargarDatos2(startDateTime, endDateTime, myMap);
        } else if (vehiculoSeleccionado === 'vehiculo2') {
            cargarDatos(startDateTime, endDateTime, myMap);
        } else if (vehiculoSeleccionado === 'vehiculos'){
            cargarAmbosDatos(startDateTime, endDateTime, myMap);
        }
    });

    if (!localStorage.getItem('hasSeenInstructions')) {
        console.log('Mostrando modal');
        var myModal = new bootstrap.Modal(document.getElementById('instructionsModal'), {
            keyboard: false
        });
        myModal.show();
        localStorage.setItem('hasSeenInstructions', 'true');
    }
});

function cargarDatos(startDateTime, endDateTime, myMap) {
    const vehiculoSeleccionado = document.getElementById('vehicleSelector').value;
    if (vehiculoSeleccionado == 'vehiculo2') {
        limpiarMapa();
        const link = `/consulta-historicos?startDateTime=${startDateTime}&endDateTime=${endDateTime}`; 
        fetch(link)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                console.log(data);
                if (data.length > 0) {
                    trayectos.forEach(trayecto => trayecto.remove());
                    trayectos = [];
                    markers.forEach(marker => marker.remove());
                    markers = [];
                    decoradores.forEach(decorador => decorador.remove());
                    decoradores = [];

                    rutaActual = L.polyline([], {
                        color: 'blue',      
                        weight: 3,          
                        opacity: 0.7,       
                        lineJoin: 'round',  
                    }).addTo(myMap);

                    trayectos.push(rutaActual);

                    let ultimoPunto = null;
                    data.forEach(point => {
                        const lat = parseFloat(point.Latitude); 
                        const lng = parseFloat(point.Longitude);
                        const nuevoPunto = L.latLng(lat, lng);

                        if (ultimoPunto && myMap.distance(ultimoPunto, nuevoPunto) > 500) {
                            if (ultimoPunto) {
                                let decorador = L.polylineDecorator(rutaActual, {
                                    patterns: [
                                        {offset: '5%', repeat: '50px', symbol: L.Symbol.arrowHead({pixelSize: 10, pathOptions: {opacity: 0.7, color: 'blue', weight: 3}})}
                                    ]
                                }).addTo(myMap);
                                decoradores.push(decorador);
                            }
                            rutaActual = L.polyline([], { color: 'blue', weight: 3, opacity: 0.7, lineJoin: 'round' }).addTo(myMap);
                            trayectos.push(rutaActual);
                        }
                        rutaActual.addLatLng(nuevoPunto);
                        ultimoPunto = nuevoPunto;
                    });

                    if (rutaActual.getLatLngs().length > 0) {
                        let decorador = L.polylineDecorator(rutaActual, {
                            patterns: [
                                {offset: '5%', repeat: '50px', symbol: L.Symbol.arrowHead({pixelSize: 10, pathOptions: {opacity: 0.7, color: 'blue', weight: 3}})}
                            ]
                        }).addTo(myMap);
                        decoradores.push(decorador);
                    }

                    if (!marcadorDeslizable1) {
                        marcadorDeslizable1 = L.marker([0, 0],{ 
                            draggable: true,
                            icon: truckIcon2
                        }).addTo(myMap);
                    }
                    actualizarSlider(data, myMap);
                } else {
                    alert("No hay datos de ruta disponibles para la ventana de tiempo seleccionada.");
                    document.getElementById('timeSlider').style.display = 'none';
                }
            })
            .catch(error => {
                console.error('Error en fetch o procesando data:', error);
                alert("Hubo un problema al cargar los datos.");
                document.getElementById('timeSlider').style.display = 'none';
            });
    }
}

function cargarDatos2(startDateTime, endDateTime, myMap) {
    const vehiculoSeleccionado = document.getElementById('vehicleSelector').value;
    if (vehiculoSeleccionado == 'vehiculo1') {
        limpiarMapa();
        const link2 = `/consulta-historicos2?startDateTime=${startDateTime}&endDateTime=${endDateTime}`; 
        fetch(link2)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data2 => {
                console.log(data2);
                if (data2.length > 0) {
                    trayectos2.forEach(trayecto => trayecto.remove());
                    trayectos2 = [];
                    markers2.forEach(marker => marker.remove());
                    markers2 = [];
                    decoradores2.forEach(decorador => decorador.remove());
                    decoradores2 = [];

                    rutaActual2 = L.polyline([], {
                        color: 'red',      
                        weight: 3,          
                        opacity: 0.7,       
                        lineJoin: 'round',  
                    }).addTo(myMap);

                    trayectos2.push(rutaActual2);

                    let ultimoPunto2 = null;
                    data2.forEach(point => {
                        const lat = parseFloat(point.Latitude); 
                        const lng = parseFloat(point.Longitude);
                        const nuevoPunto = L.latLng(lat, lng);

                        if (ultimoPunto2 && myMap.distance(ultimoPunto2, nuevoPunto) > 500) {
                            if (ultimoPunto2) {
                                let decorador = L.polylineDecorator(rutaActual2, {
                                    patterns: [
                                        {offset: '5%', repeat: '50px', symbol: L.Symbol.arrowHead({pixelSize: 10, pathOptions: {opacity: 0.7, color: 'red', weight: 3}})}
                                    ]
                                }).addTo(myMap);
                                decoradores2.push(decorador);
                            }
                            rutaActual2 = L.polyline([], { color: 'red', weight: 3, opacity: 0.7, lineJoin: 'round' }).addTo(myMap);
                            trayectos2.push(rutaActual2);
                        }
                        rutaActual2.addLatLng(nuevoPunto);
                        ultimoPunto2 = nuevoPunto;
                    });

                    if (rutaActual2.getLatLngs().length > 0) {
                        let decorador = L.polylineDecorator(rutaActual2, {
                            patterns: [
                                {offset: '5%', repeat: '50px', symbol: L.Symbol.arrowHead({pixelSize: 10, pathOptions: {opacity: 0.7, color: 'red', weight: 3}})}
                            ]
                        }).addTo(myMap);
                        decoradores2.push(decorador);
                    }

                    if (!marcadorDeslizable2) {
                        marcadorDeslizable2 = L.marker([0, 0], {
                            draggable: true,
                            icon: truckIcon
                        }).addTo(myMap);
                    }
                    actualizarSlider(data2, myMap);
                } else {
                    alert("No hay datos de ruta disponibles para la ventana de tiempo seleccionada.");
                    document.getElementById('timeSlider').style.display = 'none';
                }
            })
            .catch(error => {
                console.error('Error en fetch o procesando data:', error);
                alert("Hubo un problema al cargar los datos.");
                document.getElementById('timeSlider').style.display = 'none';
            });
    }
}


function updateDateTimeDisplay(startDateTime, endDateTime) {
    const startDateTimeStr = document.getElementById('startDateTime').value;
    const endDateTimeStr = document.getElementById('endDateTime').value;

    if (startDateTimeStr && endDateTimeStr) {
        const [startDate, startTime] = startDateTimeStr.split(' ');
        const [endDate, endTime] = endDateTimeStr.split(' ');

        document.getElementById('startDateSpan').textContent = startDate;
        document.getElementById('startTimeSpan').textContent = startTime;
        document.getElementById('endDateSpan').textContent = endDate;
        document.getElementById('endTimeSpan').textContent = endTime;
    }
}

function cargarAmbosDatos(startDateTime, endDateTime, myMap) {
    console.log("Cargando datos para ambos vehículos");

    const link1 = `/consulta-historicos?startDateTime=${startDateTime}&endDateTime=${endDateTime}`;
    const link2 = `/consulta-historicos2?startDateTime=${startDateTime}&endDateTime=${endDateTime}`;

    Promise.all([
        fetch(link1).then(response => response.json()),
        fetch(link2).then(response => response.json())
    ]).then(results => {
        const [data1, data2] = results;

        limpiarMapa();

        if (data1.length > 0) {
            procesarDatosVehiculo(data1, myMap, 'blue', truckIcon2, true);
        } else {
            console.log("No hay datos para el vehículo 1 en el rango seleccionado.");
        }

        if (data2.length > 0) {
            procesarDatosVehiculo(data2, myMap, 'red', truckIcon, false);
        } else {
            console.log("No hay datos para el vehículo 2 en el rango seleccionado.");
        }

        if (data1.length > 0 || data2.length > 0) {
            actualizarSliderAmbos(data1, data2, myMap);
            document.getElementById('timeSlider').style.display = 'block';
        } else {
            alert("No hay datos de ruta disponibles para la ventana de tiempo seleccionada.");
            document.getElementById('timeSlider').style.display = 'none';
        }
    }).catch(error => {
        console.error('Error cargando datos de ambos vehículos:', error);
        alert("Hubo un problema al cargar los datos de ambos vehículos.");
        document.getElementById('timeSlider').style.display = 'none';
    });
}

function procesarDatosVehiculo(data, myMap, color, icon, isVehiculo1) {
    let rutaActual = L.polyline([], { color: color, weight: 3, opacity: 0.7, lineJoin: 'round' }).addTo(myMap);
    let decoradores = [];
    let ultimoPunto = null;

    data.forEach(point => {
        const lat = parseFloat(point.Latitude);
        const lng = parseFloat(point.Longitude);
        const nuevoPunto = L.latLng(lat, lng);
        if (ultimoPunto && myMap.distance(ultimoPunto, nuevoPunto) > 500) {
            rutaActual = L.polyline([], { color: color, weight: 3, opacity: 0.7, lineJoin: 'round' }).addTo(myMap);
        }
        rutaActual.addLatLng(nuevoPunto);
        ultimoPunto = nuevoPunto;
    });

    let decorador = L.polylineDecorator(rutaActual, {
        patterns: [
            {offset: '5%', repeat: '50px', symbol: L.Symbol.arrowHead({pixelSize: 10, pathOptions: {opacity: 0.7, color: color, weight: 3}})}
        ]
    }).addTo(myMap);
    decoradores.push(decorador);

    if (isVehiculo1) {
        if (!marcadorDeslizable1) {
            marcadorDeslizable1 = L.marker([0, 0], {
                draggable: true,
                icon: icon
            }).addTo(myMap);
        }
    } else {
        if (!marcadorDeslizable2) {
            marcadorDeslizable2 = L.marker([0, 0], {
                draggable: true,
                icon: icon
            }).addTo(myMap);
        }
    }
}

function actualizarSlider(data, myMap) {
    const slider = document.getElementById('timeSlider');
    slider.max = data.length - 1;
    slider.value = 0;
    slider.style.display = 'block';  // Asegura que el slider esté visible

    slider.oninput = function() {
        const puntoSeleccionado = data[this.value];
        const latLng = L.latLng(puntoSeleccionado.Latitude, puntoSeleccionado.Longitude);
        if (marcadorDeslizable1) {
            marcadorDeslizable1.setLatLng(latLng);
            marcadorDeslizable1.bindPopup(`Fecha y Hora de Paso: ${puntoSeleccionado.DateTime} - RPM: ${puntoSeleccionado.RPM}`).openPopup();
        }
        if (marcadorDeslizable2) {
            marcadorDeslizable2.setLatLng(latLng);
            marcadorDeslizable2.bindPopup(`Fecha y Hora de Paso: ${puntoSeleccionado.DateTime}`).openPopup();
        }
        myMap.setView(latLng, myMap.getZoom()); // Centra el mapa en el marcador
        if (rpmGaugeHistoric) {
            rpmGaugeHistoric.set(puntoSeleccionado.RPM);
        }
    };

    slider.oninput();
}


function actualizarSliderAmbos(data1, data2, myMap) {
    const slider = document.getElementById('timeSlider');
    slider.max = Math.max(data1.length, data2.length) - 1;
    slider.value = 0;

    slider.oninput = function() {
        const index = this.value;
        if (index < data1.length) {
            const puntoSeleccionado1 = data1[index];
            const latLng1 = L.latLng(puntoSeleccionado1.Latitude, puntoSeleccionado1.Longitude);
            if (marcadorDeslizable1) {
                marcadorDeslizable1.setLatLng(latLng1);
                marcadorDeslizable1.bindPopup(`Fecha y Hora de Paso: ${puntoSeleccionado1.DateTime} - RPM: ${puntoSeleccionado1.RPM}`).openPopup();
                myMap.setView(latLng1, myMap.getZoom());
            }
        }
        if (index < data2.length) {
            const puntoSeleccionado2 = data2[index];
            const latLng2 = L.latLng(puntoSeleccionado2.Latitude, puntoSeleccionado2.Longitude);
            if (marcadorDeslizable2) {
                marcadorDeslizable2.setLatLng(latLng2);
                marcadorDeslizable2.bindPopup(`Fecha y Hora de Paso: ${puntoSeleccionado2.DateTime} - RPM: ${puntoSeleccionado2.RPM}`).openPopup();
                myMap.setView(latLng2, myMap.getZoom());
            }
        }
    };

    slider.oninput();
}

function limpiarMapa() {
    trayectos.forEach(trayecto => trayecto.remove());
    trayectos = [];
    markers.forEach(marker => marker.remove());
    markers = [];
    decoradores.forEach(decorador => {
        if (decorador.remove) {
            decorador.remove();
        }
    });
    decoradores = [];

    trayectos2.forEach(trayecto => trayecto.remove());
    trayectos2 = [];
    markers2.forEach(marker => marker.remove());
    markers2 = [];
    decoradores2.forEach(decorador => {
        if (decorador.remove) {
            decorador.remove();
        }
    });
    decoradores2 = [];

    if (marcadorDeslizable1) {
        marcadorDeslizable1.remove();
        marcadorDeslizable1 = null;
    }

    if (marcadorDeslizable2) {
        marcadorDeslizable2.remove();
        marcadorDeslizable2 = null;
    }
}