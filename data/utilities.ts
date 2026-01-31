
import { Utility } from '../types';
import { mirageUtilities } from './utilities/mirage';
import { anubisUtilities } from './utilities/anubis';

export const UTILITIES: Utility[] = [
    ...mirageUtilities,
    ...anubisUtilities
];
