/// <reference types="google.maps" />
import { useEffect, useRef } from "react";
let loading:Promise<void>|undefined;
function loadMaps() {
  if(loading) return loading;
  loading=new Promise<void>((resolve,reject)=>{ const key=import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"]; if(!key){reject(new Error("Map unavailable"));return;}
    const w=window as Window & {getXpressMapReady?:()=>void}; w.getXpressMapReady=()=>resolve();
    const s=document.createElement("script"); s.src=`https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=getXpressMapReady&channel=${import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"]??""}`; s.async=true; s.onerror=()=>reject(new Error("Map unavailable")); document.head.appendChild(s);
  });return loading;
}
export default function GoogleMap({lat,lng,onPick,onError}:{lat:number;lng:number;onPick:(lat:number,lng:number)=>void;onError:()=>void}) {
  const el=useRef<HTMLDivElement>(null),map=useRef<google.maps.Map|null>(null),marker=useRef<google.maps.Marker|null>(null),pick=useRef(onPick); pick.current=onPick;
  useEffect(()=>{let alive=true;loadMaps().then(()=>{if(!alive||!el.current)return;map.current=new google.maps.Map(el.current,{center:{lat,lng},zoom:14,clickableIcons:false,disableDefaultUI:true,zoomControl:true,gestureHandling:"greedy",styles:CLEAN});marker.current=new google.maps.Marker({position:{lat,lng},map:map.current,draggable:true});map.current.addListener("click",(e:google.maps.MapMouseEvent)=>{if(e.latLng)pick.current(e.latLng.lat(),e.latLng.lng());});marker.current.addListener("dragend",(e:google.maps.MapMouseEvent)=>{if(e.latLng)pick.current(e.latLng.lat(),e.latLng.lng());});}).catch(onError);return()=>{alive=false;marker.current?.setMap(null);};},[]);
  useEffect(()=>{map.current?.panTo({lat,lng});marker.current?.setPosition({lat,lng});},[lat,lng]);
  return <div ref={el} className="h-64 w-full rounded-lg" aria-label="Google Maps location picker"/>;
}
/** Muted GetXpress style: hides businesses, transit and road icons so the map stays clean. */
const CLEAN: google.maps.MapTypeStyle[] = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "geometry", stylers: [{ saturation: -60 }] },
  { featureType: "water", stylers: [{ color: "#cfe0ee" }] },
];
