import {useEffect,useRef} from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
export type Building={id:string;owner_id?:string;name:string;address:string;building_type:string;height_m:number;status:"draft"|"published";coordinates:number[][]};
type Props={buildings:Building[];selectedId:string|null;drawing:boolean;center:[number,number]|null;onSelect:(id:string)=>void;onDraw:(coords:number[][])=>void};
const SOURCE="woomap-buildings";
const collection=(items:Building[])=>({type:"FeatureCollection" as const,features:items.map(b=>({type:"Feature" as const,id:b.id,properties:{id:b.id,name:b.name,height:b.height_m,status:b.status},geometry:{type:"Polygon" as const,coordinates:[b.coordinates]}}))});
export default function MapView({buildings,selectedId,drawing,center,onSelect,onDraw}:Props){
const el=useRef<HTMLDivElement>(null),mapRef=useRef<maplibregl.Map|null>(null),itemsRef=useRef(buildings),selectedRef=useRef(selectedId),drawingRef=useRef(drawing),cb=useRef({onSelect,onDraw});
useEffect(()=>{itemsRef.current=buildings;const s=mapRef.current?.getSource(SOURCE) as maplibregl.GeoJSONSource|undefined;s?.setData(collection(buildings));},[buildings]);
useEffect(()=>{selectedRef.current=selectedId;const m=mapRef.current;if(m?.getLayer("woomap-3d"))m.setPaintProperty("woomap-3d","fill-extrusion-color",["case",["==",["get","id"],selectedId??""],"#f59e0b","#2788f5"]);},[selectedId]);
useEffect(()=>{drawingRef.current=drawing;if(mapRef.current)mapRef.current.getCanvas().style.cursor=drawing?"crosshair":"";},[drawing]);
useEffect(()=>{cb.current={onSelect,onDraw};},[onSelect,onDraw]);
useEffect(()=>{if(center&&mapRef.current)mapRef.current.flyTo({center,zoom:17,essential:true});},[center]);
useEffect(()=>{if(!el.current||mapRef.current)return;const m=new maplibregl.Map({container:el.current,style:"https://tiles.openfreemap.org/styles/liberty",center:[3.3792,6.5244],zoom:12.5,pitch:48,bearing:-15,maxPitch:75});mapRef.current=m;m.addControl(new maplibregl.NavigationControl(),"top-right");m.addControl(new maplibregl.ScaleControl(),"bottom-left");
m.on("load",()=>{m.addSource(SOURCE,{type:"geojson",data:collection(itemsRef.current)});m.addLayer({id:"woomap-3d",type:"fill-extrusion",source:SOURCE,paint:{"fill-extrusion-color":["case",["==",["get","id"],selectedRef.current??""],"#f59e0b","#2788f5"],"fill-extrusion-height":["get","height"],"fill-extrusion-base":0,"fill-extrusion-opacity":.88}});
m.on("click","woomap-3d",e=>{if(drawingRef.current)return;const id=e.features?.[0]?.properties?.id;if(id)cb.current.onSelect(String(id));});m.on("mouseenter","woomap-3d",()=>{if(!drawingRef.current)m.getCanvas().style.cursor="pointer";});m.on("mouseleave","woomap-3d",()=>{if(!drawingRef.current)m.getCanvas().style.cursor="";});m.on("click",e=>{if(!drawingRef.current)return;const x=e.lngLat.lng,y=e.lngLat.lat,dx=.00012,dy=.00008;cb.current.onDraw([[x-dx,y-dy],[x+dx,y-dy],[x+dx,y+dy],[x-dx,y+dy],[x-dx,y-dy]]);});});
return()=>{m.remove();mapRef.current=null;};},[]);
return <div ref={el} className="map-canvas"/>;}