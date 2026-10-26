import {createFileRoute} from '@tanstack/react-router';
import {PolicyPage,policyHead} from '@/components/site/PolicyPage';
export const Route=createFileRoute('/privacy')({head:()=>policyHead('Privacy policy','How Get Xpress handles customer, shipment and contact information.'),component:()=> <PolicyPage title='Privacy policy' sections={[
['Information we collect','Profile details, contact numbers, email, pickup and delivery addresses, parcel information, payment references and tracking events are used to manage your courier service. Location permission is optional.'],
['Delivery partners','Information needed for pickup, transport and delivery may be shared with the selected courier partner. Connected messaging and payment services receive only the details needed for that action.'],
['Tracking and security','Public tracking shows shipment status, cities and scan history, not personal phone numbers or full addresses. Staff access is restricted by their assigned role and scope.'],
['Your choices','You can update profile details in your account. Contact support for access, correction or deletion requests. Records needed for legal, accounting or dispute purposes may need to be retained.'],
['Policy approval','The legal business name, retention periods and applicable notices require confirmation before this draft is adopted for live operations.']
]}/>});
