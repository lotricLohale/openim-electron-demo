import { EventEmitter } from 'events';
const events = new EventEmitter()
events.setMaxListeners(1200)
export default events;