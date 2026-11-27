import {useState} from 'react';
import {createSpillClock} from './spillClock';
export function useSpillClock(){return useState(createSpillClock)[0];}
