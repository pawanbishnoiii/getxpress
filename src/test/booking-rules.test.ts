import {describe,it,expect} from "vitest";
import {boxPresets,quote,serviceAllowed} from "@/lib/pricing";
import {initialDraft,readDraft,saveDraft} from "@/lib/booking-draft";
describe("Booking requirements",()=>{
it("limits document presets to 0.5 kg",()=>expect(boxPresets.filter(p=>p.kind==="documents").every(p=>p.maxKg===0.5)).toBe(true));
it("defines small boxes as 25×20×10 up to 2 kg",()=>expect(boxPresets.find(p=>p.id==="small")).toMatchObject({maxKg:2,dims:{l:25,w:20,h:10}}));
it("defines medium boxes as 35×25×15 up to 5 kg",()=>expect(boxPresets.find(p=>p.id==="medium")).toMatchObject({maxKg:5,dims:{l:35,w:25,h:15}}));
it("defines large boxes as 45×35×20 up to 10 kg",()=>expect(boxPresets.find(p=>p.id==="large")).toMatchObject({maxKg:10,dims:{l:45,w:35,h:20}}));
it("rejects same day between different cities",()=>expect(serviceAllowed("same_day","Jaipur","Delhi")).toBe(false));
it("permits same day within the same city",()=>expect(serviceAllowed("same_day"," Jaipur ","jaipur")).toBe(true));
it("honours admin-disabled delivery services",()=>expect(serviceAllowed("express","Jaipur","Delhi",{express:{base:89,perKg:55,active:false}})).toBe(false));
it("uses admin rate edits",()=>expect(quote({fromPin:"302001",toPin:"302002",weightKg:0.5,service:"standard",rates:{standard:{base:100,perKg:50}}}).total).toBe(118));
it("bills each parcel using its separate dimensions",()=>expect(quote({fromPin:"302001",toPin:"302002",weightKg:0,service:"standard",pieces:[{weight_kg:1,dims:{l:25,w:20,h:10}},{weight_kg:1,dims:{l:45,w:35,h:20}}]}).weight).toBe(7.5));
it("persists guest details across reload without an account",()=>{const m=new Map<string,string>();const storage={getItem:(k:string)=>m.get(k)??null,setItem:(k:string,v:string)=>{m.set(k,v);}};const d=initialDraft();d.sender.name="Guest sender";d.pieces.push({...d.pieces[0],id:"second",preset:"large",kind:"packages",weight_kg:3,dims:{l:45,w:35,h:20}});saveDraft(storage,d);expect(readDraft(storage)).toEqual(d);});
});