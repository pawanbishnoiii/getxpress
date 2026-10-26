import { createFileRoute } from "@tanstack/react-router";
import { OrdersView } from "@/components/site/OrdersView";
export const Route = createFileRoute("/_authenticated/users/orders")({ head: () => ({meta:[{title:"My orders — Get Xpress"},{name:"description",content:"Your Get Xpress orders with status, labels and payments."},{property:"og:title",content:"My orders — Get Xpress"},{property:"og:description",content:"Your Get Xpress orders with status, labels and payments."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"}]}), component: OrdersView });
