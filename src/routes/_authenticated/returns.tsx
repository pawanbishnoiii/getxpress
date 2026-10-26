import { createFileRoute } from "@tanstack/react-router";
import { ReturnsView } from "@/components/site/ReturnsView";
export const Route = createFileRoute("/_authenticated/returns")({ head: () => ({meta:[{title:"Returns & RTO — Get Xpress"},{name:"description",content:"Manage parcel returns and RTO."},{property:"og:title",content:"Returns & RTO — Get Xpress"},{property:"og:description",content:"Manage parcel returns and RTO."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"}]}), component: ReturnsView });
