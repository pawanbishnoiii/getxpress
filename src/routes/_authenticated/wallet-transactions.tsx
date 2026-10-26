import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { AppShell,PageHeader,Stat } from '@/components/site/AppShell';
import { DataGrid } from '@/components/site/DataGrid';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useRoles } from '@/hooks/use-roles';

export const Route=createFileRoute('/_authenticated/wallet-transactions')({head:()=>({meta:[{title:'Wallet transactions — GetXpress'},{name:'description',content:'Search and export your GetXpress wallet ledger, deposits and booking deductions.'},{property:'og:title',content:'GetXpress wallet transactions'},{property:'og:description',content:'Your wallet ledger, deposits and booking deductions.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),component:Transactions});
function Transactions(){const roles=useRoles();if(!roles.isLoading&&!roles.isAdmin&&!roles.isStaff)return <AppShell><PageHeader title='Wallet transactions' sub='This ledger is only available to hubs, network partners and managers.'/></AppShell>;return <Ledger/>;}
function Ledger(){
 const {data,error}=useQuery({queryKey:['wallet-ledger'],queryFn:async()=>{
  const {data:auth,error:authError}=await supabase.auth.getUser();if(authError||!auth.user)throw new Error('Sign in to view transactions');
  const [ledger,balance]=await Promise.all([supabase.from('wallet_transactions').select('*').eq('user_id',auth.user.id).order('created_at',{ascending:false}).limit(1000),supabase.rpc('wallet_balance',{_user:auth.user.id})]);
  if(ledger.error)throw ledger.error;if(balance.error)throw balance.error;return {rows:ledger.data,balance:Number(balance.data)};
 }});
 const rows=(data?.rows??[]).map(r=>({...r,date:new Date(r.created_at).toLocaleString('en-IN'),amount:Number(r.amount)}));
 return <AppShell wide><PageHeader title="Wallet transactions" action={<Button asChild variant="outline"><Link to="/wallet">Add money / withdraw</Link></Button>}/><div className="mb-6 grid gap-3 sm:grid-cols-3"><Stat label="Available balance (₹)" value={(data?.balance??0).toLocaleString('en-IN')} tone="ink"/><Stat label="Credits in view (₹)" value={rows.filter(r=>r.amount>0).reduce((a,r)=>a+r.amount,0).toLocaleString('en-IN')}/><Stat label="Debits in view (₹)" value={Math.abs(rows.filter(r=>r.amount<0).reduce((a,r)=>a+r.amount,0)).toLocaleString('en-IN')} tone="primary"/></div>{error?<p role="alert" className="text-destructive">Transactions could not load. Please retry.</p>:<DataGrid rows={rows} cols={[{key:'date',label:'Date'},{key:'id',label:'Transaction ID'},{key:'ref',label:'Reference / UTR'},{key:'kind',label:'Type'},{key:'amount',label:'Amount (₹)'},{key:'note',label:'Description'}]} name="GetXpress wallet" rowKey={r=>r.id}/>}</AppShell>;
}