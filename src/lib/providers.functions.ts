import {createServerFn} from '@tanstack/react-start';
import {requireUser} from './auth-guard';
export const providerReadiness=createServerFn({method:'GET'}).middleware([requireUser]).handler(async({context})=>{
 const {data:admin,error}=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});if(error||!admin)throw Error('Admin only');
 // Secret presence is configuration, never evidence of working credentials or adapters.
 return [{id:'ekart',credentialsSet:Boolean(process.env['EKART_API_KEY'])},{id:'delhivery',credentialsSet:Boolean(process.env['DELHIVERY_API_KEY'])},{id:'shiprocket',credentialsSet:Boolean(process.env['SHIPROCKET_API_KEY'])},{id:'shadowfax',credentialsSet:Boolean(process.env['SHADOWFAX_API_KEY'])},{id:'tezsender',credentialsSet:Boolean(process.env['TEZSENDER_API_KEY'])}];
});
