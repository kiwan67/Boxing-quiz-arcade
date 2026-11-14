export * from '../../js/defense.js';
import * as defense from '../../js/defense.js';
import {finishReading} from './reading.mjs';
export function submitDefenseAnswer(...args){const result=defense.submitDefenseAnswer(...args);finishReading();return result;}
