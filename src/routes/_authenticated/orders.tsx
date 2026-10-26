import { createFileRoute } from "@tanstack/react-router";
import { OrdersView } from "@/components/site/OrdersView";
export const Route = createFileRoute("/_authenticated/orders")({ head: () => ({meta:[{title:"Orders — Get Xpress"},{name:"description",content:"All orders in your scope with filters and export."},{property:"og:title",content:"Orders — Get Xpress"},{property:"og:description",content:"All orders in your scope with filters and export."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"}]}), component: OrdersView });
