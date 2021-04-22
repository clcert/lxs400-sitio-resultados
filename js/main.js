document.addEventListener("DOMContentLoaded", () => {
    
    L.Polygon.addInitHook(function () {
        this._latlng = this._bounds.getCenter();
    });

    // Provide getLatLng and setLatLng methods for Leaflet.markercluster to be able to cluster polygons.
    L.Polygon.include({
        getLatLng: function () {
            return this._latlng;
        },
        setLatLng: function () {}, // Dummy method.
        getRegion: function (e, t) {
            if (!t || !this.options.regions) return null;
            (e === i || e >= t.length) && (e = t.length - 1);
            var n = Math.min(t[e], this.options.regions.length - 1);
            return this.options.regions[n];
        }
    });

    L.FeatureGroup.addInitHook(function () {
        this._latlng = null
    });

    L.FeatureGroup.include({
        getLatLng: function () {
            if (this._latlng === null) {
                this._latlng = this.getBounds().getCenter();
            }
            return this._latlng;
        },
        setLatLng: function () {}, // Dummy method.
    });



    REGIONES = [
        "REGIÓN DE ARICA Y PARINACOTA",
        "REGIÓN DE TARAPACÁ",
        "REGIÓN DE ANTOFAGASTA",
        "REGIÓN DE ATACAMA",
        "REGIÓN DE COQUIMBO",
        "REGIÓN DE VALPARAÍSO",
        "REGIÓN METROPOLITANA DE SANTIAGO",
        "REGIÓN DEL LIBERTADOR GENERAL BERNARDO O'HIGGINS",
        "REGIÓN DEL MAULE",
        "REGIÓN DE ÑUBLE",
        "REGIÓN DEL BIOBÍO",
        "REGIÓN DE LA ARAUCANÍA",
        "REGIÓN DE LOS RÍOS",
        "REGIÓN DE LOS LAGOS",
        "REGIÓN DE AYSÉN DEL GENERAL CARLOS IBÁÑEZ DEL CAMPO",
        "REGIÓN DE MAGALLANES Y DE LA ANTÁRTICA CHILENA"
    ]


    function manzanaColor(m) {
        var min = 1;
        var max = 15;
        var perc = 75 - Math.min((m.s.length - min)/(max - min) * 50, 50)
        return `hsl(40, 70%, ${perc}%)`
    }

    function dibujarBarras(labels, selecc, total) {
        var seleccionadas = []
        var todas = []
        var total_todas = Object.values(total).reduce( (x,y) => x + y, 0)
        var total_seleccionadas = selecc.reduce( (x,y) => x+y.n, 0)
        REGIONES.forEach( (r,i) => {
            todas.push((total[r] / total_todas * 100).toFixed(1))
            seleccionadas.push((selecc[i].n / total_seleccionadas * 100).toFixed(1))
        })
        var ctx = document.getElementById("resumen-bar").getContext('2d');
        return new Chart(ctx, {
            type: 'horizontalBar',
            data: {
                labels: labels,
                datasets: [{
                    label: "% viviendas seleccionadas",
                    backgroundColor: "#3e99fb",
                    data: seleccionadas
                },{
                    label: "% total de viviendas",
                    backgroundColor: "#0e55aa",
                    data: todas
                }]
            },
            options: {
                elements: {
                    rectangle: {
                        borderWidth: 2,
                    }
                },
                responsive: true,
                maintainAspectRatio: false,
                legend: {
                    display: true,
                },
                title: {
                    display: true,
                    text: "% de manzanas elegidas por región versus porcentaje de viviendas por región"
                }
            }
        });
    }

    function dibujarTablas(stats) {
        $('#regiones-tabla').DataTable( {
            data: stats.regiones,
            iDisplayLength: 16,
            bLengthChange: false,
            bFilter: false,
            bInfo: false,
            bPaginate: false,
            bAutoWidth: false, 
            columns: [
                { "data" : "pos", "searchable": false, "title": "Orden", "width": "10px"},
                { "title": "Región", "data" : "region", "searchable": false, "width": "100%" },
                { "title": "Viviendas Seleccionadas", "data" : "n", "searchable": false, "width": "30px"},
            ],
            language: {
                "url": "https://cdn.datatables.net/plug-ins/1.10.21/i18n/Spanish.json"
            }
        } );
        $('#comunas-tabla').DataTable( {
            deferRender: true,
            bLengthChange: false,
            data: stats.comunas,
            bAutoWidth: false, 
            columns: [
                { "title": "Comuna", "data" : "comuna", "width": "40%" },
                { "title": "Provincia", "data" : "provincia", "searchable": false},
                { "title": "Región", "data" : "region", "searchable": false },
                { "title": "Viviendas Seleccionadas", "data" : "n", "searchable": false, "width": "30px" },
            ],
            language: {
                "url": "https://cdn.datatables.net/plug-ins/1.10.21/i18n/Spanish.json"
            }
        } );  
        $('#manzanas-tabla').DataTable( {
            deferRender: true,
            bLengthChange: false,
            data: stats.manzanas,
            bAutoWidth: false, 
            columns: [
                { "data" : "id", "title": "N° Manzana", "width": "30px"},
                { "title": "Distrito", "data" : "distrito", "width": "100%" },
                { "title": "Comuna", "data" : "comuna" },
                { "title": "Provincia", "data" : "provincia" },
                { "title": "Región", "data" : "region" },
                { "title": "Viviendas Seleccionadas", "data" : "n", "searchable": false, "width": "30px" },
            ],
            language: {
                "url": "https://cdn.datatables.net/plug-ins/1.10.21/i18n/Spanish.json"
            }
        } );    

        $(".table").on('click', 'tbody tr', function(e) {
            e.preventDefault();  
            var table = $(e.delegateTarget).DataTable({retrieve: true})
            var currentRow = $(this).closest("tr");
            var data = table.row(currentRow).data();
            map.fitBounds(data.m.getBounds());
            data.m.openPopup()
            $("tbody tr").removeClass( 'highlight-table' );
            if ($(this).parents("table").hasClass("highlight-map")) {
                $(this).addClass( 'highlight-table' );
                highlightLayer.clearLayers();
                highlightLayer.addData(data.m.toGeoJSON());          
            }
        })
        $(".table").on('page.dt', function() {
            $("tbody tr").removeClass( 'highlight-table' );
            highlightLayer.clearLayers();
            map.closePopup();

        });
        map.on("click", function(e) {
            highlightLayer.clearLayers();
            $("tbody tr").removeClass( 'highlight-table' );
          });          
    }
    var map = L.map('map',{
        preferCanvas: true,
        zoomControl: false
    }).setView([-33.8, -70], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    L.control.zoom({
        position:'bottomleft'
    }).addTo(map);

    var clusterLayer = L.markerClusterGroup({
        allowClustersOfOne: true,
        maxClusterRadius: 80,
        chunkedLoading: true, 
        addRegionToolTips: true,
        disableClusteringAtZoom: 15,
        spiderLegPolylineOptions: { weight: 0, color: '#222', opacity: 0 },
        showCoverageOnHover: false,
        iconCreateFunction: cluster =>  { 
            var children = cluster.getAllChildMarkers();
            var n = 0;
            children.forEach( c => {
                n += c.options.s.length
            })
            var c = ' marker-cluster-';
            if (n < 10000) {
                c += 'small';
            } else if (n < 20000) {
                c += 'medium';
            } else {
                c += 'large';
            }
    
            return new L.DivIcon({ html: '<div><span>' + n + '</span></div>', className: 'marker-cluster' + c, iconSize: new L.Point(40, 40) });    
        }
    });

    var highlightLayer = L.geoJson(null, {
        style: function (feature) {
            return {
              color: "#00FFFF",
              weight: 2,
              opacity: 1,
              fillColor: "#00FFFF",
              fillOpacity: 0.5,
              clickable: false
            };
        }
    });
    map.addLayer(clusterLayer);  
    map.addLayer(highlightLayer);

    conseguirDatosManzanas();

    function conseguirDatosManzanas() {
        fetch('results/manzanas.json')
        .then(response => response.json())
        .then(data => {
            d = new Date(data.ts)
            $("#pulse-number").text(`${data.p} de la cadena ${data.c}`)
            $("#pulse-number").attr('href', data.u)
            $("#pulse-date").text(`${d.toLocaleDateString("es-ES")} a las ${d.toLocaleTimeString("es-ES")}`)
            var regiones = []
            var stats = {
                "regiones": Array(REGIONES.length),
                "provincias": [],
                "comunas": [],
                "distritos": [],
                "manzanas": [],
            }
            for (const [nombreRegion, region] of Object.entries(data.r)) {
                var regionMarkers = []
                var regionStats = {
                    "region": nombreRegion,
                    "pos": REGIONES.indexOf(nombreRegion) + 1,
                    "n": 0,
                    "viviendas": 0,
                }
                for (const [nombreProvincia, provincia] of Object.entries(region)) {
                    var provinciaMarkers = []
                    var provinciaStats = {
                        "region": nombreRegion,
                        "provincia": nombreProvincia,
                        "n": 0,
                        "viviendas": 0,
                    }
                    for (const [nombreComuna, comuna] of Object.entries(provincia)) {
                        var comunaMarkers = []
                        var comunaStats = {
                            "region": nombreRegion,
                            "provincia": nombreProvincia,    
                            "comuna": nombreComuna,
                            "n": 0,
                            "viviendas": 0,
    
                        }
                        for (const [nombreDistrito, distrito] of Object.entries(comuna)) {
                            var distritoMarkers = []
                            var distritoStats = {
                                "region": nombreRegion,
                                "provincia": nombreProvincia,    
                                "comuna": nombreComuna,    
                                "distrito": nombreDistrito,
                                "n": 0,
                                "viviendas": 0,
                            }
                            distrito.forEach(manzana => {
                                var m = new L.Polygon(manzana.p, manzana)
                                m.bindPopup(`<b>Manzana N° ${manzana.i}</b><br/>
                                <u>Seleccionada <b>${manzana.s.length}</b> ${manzana.s.length == 1 ? 'vez' : 'veces'}</u><br/>
                                <b>N° Viviendas: </b>${manzana.v}<br/>
                                <b>N° Habitantes: </b>${manzana.h}<br/>
                                <b>Distrito: </b>${nombreDistrito}<br/>
                                <b>Comuna: </b>${nombreComuna}<br/>
                                <b>Provincia: </b>${nombreProvincia}<br/>
                                <b>Región:</b>${nombreRegion}<br/>`)
                                m.setStyle({fillColor: manzanaColor(manzana), color: manzanaColor(manzana), fillOpacity: 0.75})    
                                m.on('click', function(e) {
                                    $("tbody tr").removeClass( 'highlight-table' );
                                    highlightLayer.clearLayers();
                                    highlightLayer.addData(m.toGeoJSON());      
                                });
                                var row = {
                                    "id": manzana.i,
                                    "distrito": nombreDistrito,
                                    "comuna": nombreComuna,
                                    "provincia": nombreProvincia,
                                    "region": nombreRegion,
                                    "regions": ["Chile", nombreRegion, nombreProvincia, nombreComuna, nombreDistrito],
                                    "n": manzana.s.length,
                                    "viviendas": manzana.v,
                                    "personas": manzana.h,
                                    "m": m
                                }
                                distritoMarkers.push(m)
                                distritoStats.n = row.n
                                comunaStats.n += row.n
                                provinciaStats.n += row.n
                                regionStats.n += row.n
                                distritoStats.viviendas += row.viviendas
                                comunaStats.viviendas += row.viviendas
                                provinciaStats.viviendas += row.viviendas
                                regionStats.viviendas += row.viviendas
                                stats.manzanas.push(row)
                            })
                            var distritoGroup = L.featureGroup(distritoMarkers);
                            distritoStats.m = distritoGroup
                            stats.distritos.push(distritoStats)
                            comunaMarkers.push(distritoGroup)
                        }
                        var comunaGroup = L.featureGroup(comunaMarkers);
                        comunaStats.m = comunaGroup
                        stats.comunas.push(comunaStats)
                        provinciaMarkers.push(comunaGroup)
                    }
                    var provinciaGroup = L.featureGroup(provinciaMarkers);
                    provinciaStats.m = provinciaGroup
                    stats.provincias.push(provinciaStats)
                    regionMarkers.push(provinciaGroup)
               }
                var regionGroup = L.featureGroup(regionMarkers);
                stats.regiones[REGIONES.indexOf(nombreRegion)] = regionStats
                regionStats.m = regionGroup
                regiones.push(regionGroup)
            }
            clusterLayer.addLayers(regiones);
            dibujarTablas(stats)
            dibujarBarras(REGIONES, stats.regiones, data.v);
            $('#intro-modal').modal('toggle');
            $("#loading-mask").hide();
        }).catch(err => {
            console.log(err)
            mostrarCuentaRegresiva()
        });    
    }

    function mostrarCuentaRegresiva() {
        fetch('https://random.uchile.cl/lxs400/fecha.json')
        .then(response => response.json())
        .then(data => {
            var d = new Date(0);
            d.setUTCSeconds(data.manzanas/1000); // fecha está en epoch con milisegundos
            var timer = setInterval(function() {
                $("#loading-message").hide()    
                let now = new Date().getTime(); 
                let t = d - now; 
                if (t >= 0) {
                    $("#progress-gif").hide()
                    $("#countdown").show()
                    let days = Math.floor(t / (1000 * 60 * 60 * 24));
                    let hours = Math.floor((t % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    let minutes = Math.floor((t % (1000 * 60 * 60)) / (1000 * 60));
                    let seconds = Math.floor((t % (1000 * 60)) / 1000);
                    let untilStr = `${days} día${days == 1 ? "" : "s"}, ${hours} hora${hours == 1 ? "" : "s"}, ${minutes} minuto${minutes == 1 ? "" : "s"} y ${seconds} segundo${seconds == 1 ? "" : "s"}` 
                    $("#countdown-span").text(untilStr)
                } else {
                    $("#progress-gif").show()
                    $("#countdown").hide()
                    $("#process-message").show()
                    clearInterval(timer)
                    setTimeout(function(){
                        conseguirDatosManzanas();
                    },1000 * (Math.random()* (120-60+1) + 60)); 
                }
            }, 1000);
        }).catch( err => {
            $("#loading-message").hide()    
            $("#error-message").show()
        })
    }

    const resizer = new Resizer('.main-container', {
        onUpCallback: function(e) {
            map.invalidateSize();      
        }
    });
});
