import { createFileRoute } from "@tanstack/react-router";
import { ReturnsView } from "@/components/site/ReturnsView";
export const Route = createFileRoute("/_authenticated/users/returns")({ head: () => ({meta:[{title:"Return a parcel — Get Xpress"},{name:"description",content:"Return an order you received."},{property:"og:title",content:"Return a parcel — Get Xpress"},{property:"og:description",content:"Return an order you received."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"}]}), component: ReturnsView });
