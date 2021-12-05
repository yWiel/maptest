import {log} from './log.js';

/*
    点边保存  mapJsonInfo(layers)
*/ 
// 点边加载


export function lenCalc(latlngs) {

    let len = 0;
    for(let i = 0;i<=latlngs.length-2 ;i++) {

        len += Math.sqrt(Math.abs(
            (latlngs[i].lat-latlngs[i+1].lat)* (latlngs[i].lat-latlngs[i+1].lat)
            - (latlngs[i].lng-latlngs[i+1].lng)* (latlngs[i].lng-latlngs[i+1].lng)
            ))
    }

    return len*11;
}

export function mapJsonInfo(layers) {
    let json = [];
    for(let i in layers) {
        let lay = layers[i];
        json.push(infopack(lay));
    }
    return json;
}

export function Jsonload(layers,map) {
    for(let i in layers) {
        let lay = layers[i],unit;
        if(lay.pm._shape == "Line") {
            unit = L.polyline(lay._latlngs);
        } else if(lay.pm._shape == "Marker") {
            unit = L.marker(lay._latlng);
        } else if(lay.pm._shape == "CircleMarker") {
            unit = L.circleMarker(lay._latlng);
        } else if(lay.pm._shape == "Rectangle") {
            unit = L.rectangle(lay._latlngs);
        } else if(lay.pm._shape == "Polygon") {
            unit = L.polygon(lay._latlngs);
        }
        unit.details = lay.details;

        unit.addTo(map);
    }
}

// 给标记绑定事件
export function clickbind(layers,upd) {
    for(let i in layers) {
        if( !(layers[i].pm._shape == "Marker" || layers[i].pm._shape == "CircleMarker" )) {
            layers[i].on("click",function(e){
                this.setStyle( {
                    color : "blue"
                })
                upd.pane3 = this;
            })
        } else {
            layers[i].on("click",function(e){
                upd.latest = this;
                upd.update();
            })
        }

        
    }
}

export function infopack(lay) {
    let unit  = {
        pm : {
            _shape : ""
        },
        details : {},
        _latlng : {},
        _latlngs : {}
    };
    
    unit.pm._shape = lay.pm._shape;
    unit.details = lay.details;
    if(lay.pm._shape == "Marker") {
        unit._latlng = lay._latlng;
    } else if(lay.pm._shape == "Line"){
        unit.details.len = lenCalc(lay._latlngs);
        unit._latlngs = lay._latlngs;
    } else if(lay.pm._shape == "CircleMarker"){
        unit._latlng = lay._latlng;
    } else if(lay.pm._shape == "Rectangle") {
        unit._latlngs = lay._latlngs;
    } else if(lay.pm._shape == "Polygon") {
        unit._latlngs = lay._latlngs;
    }
    return unit;
}

function IsLine(type) {
    return type=="Line";
}

export function getDotID(latlng,layers) {
    for(let i in layers) {
        let lay = layers[i] ,unit;
        if(lay.pm._shape!= "Marker") continue;

        if(latlng.lat == lay._latlng.lat &&
            latlng.lng == lay._latlng.lng) {
            return lay._leaflet_id;
        }
    }
}

export function pairhash(latlng) {
    return Math.trunc( (latlng.lat)*1000 + latlng.lng*10);
}


export var modal = {

    
    Build : function(layers) {
        var dots = new Map();

        // 点hash更新
        for(let i in layers) {
            let lay = layers[i],unit;
            if( !(layers[i].pm._shape == "Marker" || layers[i].pm._shape == "CircleMarker" ))
                continue;
            lay.details.hash = pairhash(lay._latlng);      
        }
        
        // 根据边创建边和点
        for(let i in layers) {

            // 建立双边
            let lay = layers[i],unit = {
                st : "", ed : "",edge : "",len : ""
            } , unit_ni = {
                st : "", ed : "",edge : "",len : ""
            };

            if(!IsLine(lay.pm._shape))   continue;
            
            let st = pairhash(lay._latlngs[0]);
            
            // 始末的点信息hash
            unit_ni.ed =  unit.st = st, 
            unit_ni.st =  unit.ed = pairhash(lay._latlngs[lay._latlngs.length-1]);
            unit_ni.edge = unit.edge = lay;
            unit_ni.len = unit.len = lay.details.len;

            // 登记点
            if(!dots.has(st))   dots.set(st,[]);
            if(!dots.has(unit_ni.st))   dots.set(unit_ni.st,[]);


            dots.get(st).push(unit);
            dots.get(unit_ni.st).push(unit_ni);
        }
        return dots;
    },
    dijkstra: function(st,ed,dots) {
        // 传入hashid
        let ck = new Set();
        let dist = new Map();
        let path = new Map();       // 表示通向i的最短路必经边
        const Imax = 233333;
        for(let [key,value] of dots)    dist.set(key,Imax);
        dist.set(st,0);

        for(let [key,value] of dots) {
            let t = -1;
            
            
            // 最小扩展
            for(let [key1,value] of dots) {
                if(!ck.has(key1) && (t==-1 || dist.get(key1) < dist.get(t) ) ) {
                    t = key1;
                }
            }
            
            let edges = dots.get(t);

            // 最小点发散
            for(let j in edges) {
                let edge = edges[j];

                if( dist.get(t)+edge.len < dist.get(edge.ed)) {

                    dist.set(edge.ed,dist.get(t)+edge.len);
                    path.set(edge.ed,edge);
                }
                
            }
            
            ck.add(t);
        }

        let need_path = {
            sum : dist.get(ed),
            need : []
        }
        let edx = ed;
        while(edx!=st) {

            let edge1 = path.get(edx);
            need_path.need.push(edge1);
            edx = edge1.st;
        }
        
        return need_path;
    }
}

export function pathBlue(layers) {
    for(let i in layers) {
        let lay = layers[i];
        if(lay.pm._shape!= "Line") continue;
        lay.setStyle({
            color : "#3388FF"
        })
    }
}