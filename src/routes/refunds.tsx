import {createFileRoute} from '@tanstack/react-router';
import {PolicyPage,policyHead} from '@/components/site/PolicyPage';
export const Route=createFileRoute('/refunds')({head:()=>policyHead('Cancellations & refunds','Get Xpress booking cancellation, payment and return policy.'),component:()=> <PolicyPage title='Cancellations & refunds' sections={[
['Before pickup','Contact support with your master AWB to request cancellation. Eligibility depends on whether the booking has already been handed to a delivery partner.'],
['After pickup','A shipment already in transit may need a return-to-origin request instead of cancellation. Transport and return charges depend on the selected service and partner terms.'],
['Return charges','Return-to-origin, reverse pickup, re-delivery and extra packaging can attract additional charges. Support must disclose the applicable amount before approval. These charges are not a blanket restocking fee and do not automatically cancel the original freight charge.'],
['Refund review','Eligible paid bookings are reviewed against the payment record and shipment history. An approved refund is returned through the original payment method where supported; support will confirm the amount and expected timing.'],
['Cash collection','For unpaid pay-at-pickup bookings there is no online payment to refund. Any cash already collected must be reconciled with the collecting partner.'],
['Approval required','Exact cancellation fees and refund timelines must be approved by the business before live payment collection.']
]}/>});
