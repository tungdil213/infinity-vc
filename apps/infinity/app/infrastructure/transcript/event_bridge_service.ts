import { eventBus } from '#infrastructure/events/event_bus'
import { EventBridgeService, transmitAdapter } from '@infinity.dev/transcript-adonis'

export { EventBridgeService } from '@infinity.dev/transcript-adonis'

export const eventBridgeService = new EventBridgeService(eventBus.getUnderlyingBus(), transmitAdapter)
