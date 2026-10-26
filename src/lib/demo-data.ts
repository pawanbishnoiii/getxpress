export type DemoShipment={tracking_number:string;customer:string;sender_city:string;receiver_city:string;hub:string;status:string;service:string;price:number;pieces_count:number;contents:string};
export const DEMO_HUBS=[{name:'Jaipur Central Hub',city:'Jaipur',pincode:'302001',manager:'Neha Sharma',capacity:120},{name:'Delhi North Hub',city:'New Delhi',pincode:'110001',manager:'Arjun Mehta',capacity:180},{name:'Mumbai West Hub',city:'Mumbai',pincode:'400001',manager:'Farah Khan',capacity:150}];
export const DEMO_CUSTOMERS=[{name:'Priya Sharma',city:'Jaipur',business:'Personal',orders:3},{name:'Rohan Mehta',city:'Delhi',business:'Mehta Stationery',orders:8},{name:'Aisha Khan',city:'Mumbai',business:'Studio Aisha',orders:5},{name:'Karan Shah',city:'Pune',business:'Shah Electronics',orders:4}];
export const DEMO_SHIPMENTS:DemoShipment[]=[
{tracking_number:'DEMO-GX1001',customer:'Priya Sharma',sender_city:'Jaipur',receiver_city:'New Delhi',hub:'Jaipur Central Hub',status:'booked',service:'express',price:185,pieces_count:2,contents:'Books and documents'},
{tracking_number:'DEMO-GX1002',customer:'Rohan Mehta',sender_city:'New Delhi',receiver_city:'Mumbai',hub:'Delhi North Hub',status:'at_hub',service:'standard',price:240,pieces_count:3,contents:'Stationery packs'},
{tracking_number:'DEMO-GX1003',customer:'Aisha Khan',sender_city:'Mumbai',receiver_city:'Pune',hub:'Mumbai West Hub',status:'in_transit',service:'express',price:165,pieces_count:1,contents:'Cotton garments'},
{tracking_number:'DEMO-GX1004',customer:'Karan Shah',sender_city:'Pune',receiver_city:'Jaipur',hub:'Jaipur Central Hub',status:'delivered',service:'standard',price:310,pieces_count:2,contents:'Phone accessories'},
{tracking_number:'DEMO-GX1005',customer:'Priya Sharma',sender_city:'Jaipur',receiver_city:'Jaipur',hub:'Jaipur Central Hub',status:'out_for_delivery',service:'same_day',price:95,pieces_count:1,contents:'A4 document envelope'},
{tracking_number:'DEMO-GX1006',customer:'Rohan Mehta',sender_city:'New Delhi',receiver_city:'Mumbai',hub:'Delhi North Hub',status:'exception',service:'standard',price:205,pieces_count:1,contents:'Office supplies'},
];
export const DEMO_STATES=['booked','picked_up','at_hub','in_transit','out_for_delivery','delivered'] as const;
export function advanceDemo(s:DemoShipment):DemoShipment{const i=DEMO_STATES.findIndex(x=>x===s.status);return {...s,status:DEMO_STATES[Math.min(Math.max(i+1,0),DEMO_STATES.length-1)]??'booked'};}
export function demoPieceIds(s:DemoShipment){return Array.from({length:s.pieces_count},(_,i)=>`${s.tracking_number}-P${i+1}`)}
