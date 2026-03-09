// Notifications — unified re-export (v4.1.1-C: T385)
export { sendAlert } from "./notification-service"
export type {
  AlertChannel,
  AlertSeverity,
  AlertCategory,
  AlertOptions,
  AlertResult,
} from "./notification-service"
export { sendSlackAlert } from "./slack-provider"
export { sendEmailAlert } from "./email-provider"
