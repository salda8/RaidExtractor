import { Injectable } from '@angular/core';
import { Store, StoreConfig } from '@datorama/akita';
import { OptimizeDialogSettings } from './optimize-dialog.settings';

export interface OptimizeDialogState {
  optimizeDialogSettings: OptimizeDialogSettings
}

export function createInitialState(): OptimizeDialogState {
  return {
    optimizeDialogSettings: {
      filter: 'all',
      maxToSixteen: false,
      preferredSet: '',

      minimumHealth: 0,
      maximumHealth: 0,
      capHealth: 0,
      weightHealth: undefined,

      minimumAttack: 0,
      maximumAttack: 0,
      capAttack: 0,
      weightAttack: undefined,

      minimumDefense: 0,
      maximumDefense: 0,
      capDefense: 0,
      weightDefense: undefined,

      minimumSpeed: 0,
      maximumSpeed: 0,
      capSpeed: 0,
      weightSpeed: undefined,

      minimumCriticalChance: 0,
      maximumCriticalChance: 0,
      capCriticalChance: 100,
      weightCriticalChance: undefined,

      minimumCriticalDamage: 0,
      maximumCriticalDamage: 0,
      capCriticalDamage: 0,
      weightCriticalDamage: undefined,

      minimumResistance: 0,
      maximumResistance: 0,
      capResistance: 0,
      weightResistance: undefined,

      minimumAccuracy: 0,
      maximumAccuracy: 0,
      capAccuracy: 0,
      weightAccuracy: undefined,

      optimizeWeapon: true,
      optimizeHelmet: true,
      optimizeShield: true,
      optimizeGloves: true,
      optimizeChest: true,
      optimizeBoots: true,
      optimizeRing: true,
      optimizeCloak: true,
      optimizeBanner: true,
    }
  };
}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'optimize-dialog' })
export class OptimizeDialogStore extends Store<OptimizeDialogState> {

  constructor() {
    super(createInitialState());
  }

}

