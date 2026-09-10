import "server-only";
import type {RedemptionProvider} from "./types";
// Future provider-neutral fulfillment boundary. Request creation never calls a provider.
// Add provider idempotency, confirmation and refund/reconciliation before real fulfillment.
export const demoRedemptionProvider:RedemptionProvider={async fulfill(){return {status:"not_connected"};}};
