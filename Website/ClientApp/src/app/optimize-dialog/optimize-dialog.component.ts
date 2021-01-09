import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { take } from 'rxjs/operators';
import { ArtifactOptimizerSettings } from '../shared/artifact-optimizer-settings';
import { RaidAccount } from '../shared/raid-account';
import { Hero } from '../shared/clients';
import { Artifact } from '../shared/clients';
import { Raid } from '../shared/raid';
import { StatValue } from '../shared/stat-value';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ArtifactBonus } from '../shared/clients';
import { OptimizeDialogQuery } from './optimize-dialog.query';
import { OptimizeDialogSettings } from './optimize-dialog.settings';
import { OptimizeDialogStore } from './optimize-dialog.store';

@Component({
  selector: 'app-optimize-dialog',
  templateUrl: './optimize-dialog.component.html'
})
export class OptimizeDialogComponent implements OnInit {
  sets: { name: string, setKind: string }[] = [];
  settings: OptimizeDialogSettings;

  constructor(
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<OptimizeDialogComponent>,
    private optimizeDialogQuery: OptimizeDialogQuery,
    private optimizeDialogStore: OptimizeDialogStore,
    @Inject(MAT_DIALOG_DATA) private data: {
      account: RaidAccount,
      hero: Hero,
    }
  ) {
    for (let setKind in Raid.sets) {
      if (!Raid.sets.hasOwnProperty(setKind)) {
        continue;
      }
      this.sets.push({ name: Raid.sets[setKind].name, setKind: setKind });
    }
  }

  ngOnInit(): void {
    this.settings = { ...this.optimizeDialogQuery.getValue().optimizeDialogSettings };
  }

  optimize() {
    if (this.settings.weightHealth +
      this.settings.weightAttack +
      this.settings.weightDefense +
      this.settings.weightSpeed +
      this.settings.weightCriticalChance +
      this.settings.weightCriticalDamage +
      this.settings.weightResistance +
      this.settings.weightAccuracy ===
      0) {
      this.snackBar.open(
        'You need to specify at least one stat that you care about (use sliders)',
        '',
        { duration: 5000 });
      return;
    }

    console.log(this.settings);

    const artifacts = this.getArtifacts();
    const settings = new ArtifactOptimizerSettings(
      this.data.account,
      this.data.hero,
      artifacts,
      this.getWeights(artifacts),
      this.toStatValues(this.settings.minimumHealth,
        this.settings.minimumAttack,
        this.settings.minimumDefense,
        this.settings.minimumSpeed,
        this.settings.minimumCriticalChance,
        this.settings.minimumCriticalDamage,
        this.settings.minimumResistance,
        this.settings.minimumAccuracy),
      this.toStatValues(this.settings.capHealth,
        this.settings.capAttack,
        this.settings.capDefense,
        this.settings.capSpeed,
        this.settings.capCriticalChance,
        this.settings.capCriticalDamage,
        this.settings.capResistance,
        this.settings.capAccuracy),
      this.toStatValues(this.settings.maximumHealth,
        this.settings.maximumAttack,
        this.settings.maximumDefense,
        this.settings.maximumSpeed,
        this.settings.maximumCriticalChance,
        this.settings.maximumCriticalDamage,
        this.settings.maximumResistance,
        this.settings.maximumAccuracy)
    );

    this.optimizeDialogStore.update({ optimizeDialogSettings: this.settings });
    console.log(settings);

    this.dialogRef.close(settings);
  }

  getArtifacts(): Artifact[] {
    const exclude: number[] = [];
    if (this.settings.filter !== 'all') {
      for (let hero of this.data.account.heroes) {
        if (!hero.artifacts || hero.id === this.data.hero.id) {
          continue;
        }

        for (let id of hero.artifacts) {
          exclude.push(id);
        }
      }
    }

    const artifacts = [];
    const equipped = this.data.hero.artifacts || [];
    const grade = parseInt(this.data.hero.grade.replace('Stars', ''));
    for (let artifact of this.data.account.artifacts) {
      if (exclude.indexOf(artifact.id) >= 0) {
        continue;
      }

      if (artifact.kind === 'Ring' && grade < 4) {
        continue;
      }
      if (artifact.kind === 'Cloak' && this.data.hero.awakenLevel < 5) {
        continue;
      }
      if (artifact.kind === 'Banner' && this.data.hero.awakenLevel < 6) {
        continue;
      }

      let optimize = this.settings[`optimize${artifact.kind}`];
      if (!optimize && equipped.indexOf(artifact.id) === -1) {
        continue;
      }

      // Make a copy of the artifact (and it's primary bonus, the new Artifact(artifact) is a shallow clone)
      let art = new Artifact(artifact);
      art.primaryBonus = new ArtifactBonus(artifact.primaryBonus);
      if (this.settings.maxToSixteen) {
        let rank = parseInt(Raid.rank[art.rank]);
        if (art.primaryBonus.isAbsolute) {
          switch (art.primaryBonus.kind) {
            case 'Speed':
              art.primaryBonus.value = 15 + rank * 5;
              break;
            case 'Health':
              art.primaryBonus.value = [0, 1340, 1820, 2300, 2840, 3480, 4080][rank];
              break;
            case 'Accuracy':
            case 'Resistance':
              art.primaryBonus.value = [0, 26, 38, 49, 64, 78, 96][rank];
              break;
            default:
              art.primaryBonus.value = [0, 90, 120, 155, 190, 225, 265][rank];
              break;
          }
        } else {
          if (art.kind === 'Ring' || art.kind === 'Cloak' || art.kind === 'Banner') {
            // TODO; Figure out what the max is for this
            art.primaryBonus.value = [0, art.primaryBonus.value, art.primaryBonus.value, 0.2, 0.25, 0.33, 0.4][rank];
          } else {
            if (art.primaryBonus.kind === 'CriticalDamage') {
              // TODO; Figure out what the max is for critical damage
              art.primaryBonus.value = [0, art.primaryBonus.value, art.primaryBonus.value, 0.4, 0.49, 0.65, 0.8][rank];
            } else {
              art.primaryBonus.value = 0.1 * rank;
            }
          }
        }
      }
      artifacts.push(art);
    }
    return artifacts;
  }

  toStatValues(health: number, attack: number, defense: number, speed: number, criticalChance: number, criticalDamage: number, resistance: number, accuracy: number): StatValue[] {
    let result: StatValue[] = [];
    result.push(this.toStatValue('Health', this.data.hero.health, health));
    result.push(this.toStatValue('Attack', this.data.hero.attack, attack));
    result.push(this.toStatValue('Defense', this.data.hero.defense, defense));
    result.push(this.toStatValue('Speed', this.data.hero.speed, speed));
    result.push(this.toStatValue('CriticalChance', this.data.hero.criticalChance, criticalChance));
    result.push(this.toStatValue('CriticalDamage', this.data.hero.criticalDamage, criticalDamage));
    result.push(this.toStatValue('Resistance', this.data.hero.resistance, resistance));
    result.push(this.toStatValue('Accuracy', this.data.hero.accuracy, accuracy));

    return result.filter(r => !!r);
  }

  toStatValue(stat: string, base: number, value: number): StatValue | undefined {
    if (value !== null && value >= base) {
      return new StatValue(stat, value - base);
    }
    return undefined;
  }

  getWeights(artifacts: Artifact[]): StatValue[] {
    const maxValues: number[] = [0, 0, 0, 0, 0, 0, 0, 0];
    for (let artifact of artifacts) {
      maxValues[0] = Math.max(maxValues[0], this.data.account.getBonusValue(artifact, this.data.hero.health, 'Health'));
      maxValues[1] = Math.max(maxValues[1], this.data.account.getBonusValue(artifact, this.data.hero.attack, 'Attack'));
      maxValues[2] = Math.max(maxValues[2], this.data.account.getBonusValue(artifact, this.data.hero.defense, 'Defense'));
      maxValues[3] = Math.max(maxValues[3], this.data.account.getBonusValue(artifact, this.data.hero.speed, 'Speed'));
      maxValues[4] = Math.max(maxValues[4], this.data.account.getBonusValue(artifact, 100, 'CriticalChance'));
      maxValues[5] = Math.max(maxValues[5], this.data.account.getBonusValue(artifact, 100, 'CriticalDamage'));
      maxValues[6] = Math.max(maxValues[6], this.data.account.getBonusValue(artifact, this.data.hero.resistance, 'Resistance'));
      maxValues[7] = Math.max(maxValues[7], this.data.account.getBonusValue(artifact, this.data.hero.accuracy, 'Accuracy'));
    }

    const weights: number[] = [
      this.settings.weightHealth, this.settings.weightAttack, this.settings.weightDefense, this.settings.weightSpeed, this.settings.weightCriticalChance,
      this.settings.weightCriticalDamage, this.settings.weightResistance, this.settings.weightAccuracy
    ];

    let totalWeight = 0;
    const result: StatValue[] = [];
    for (let i = 0; i < maxValues.length; i++) {
      if (maxValues[i] === 0) {
        continue;
      }
      const weight = weights[i] / maxValues[i];
      if (weight === 0) {
        continue;
      }
      totalWeight += weights[i];
      result.push(new StatValue(['Health', 'Attack', 'Defense', 'Speed', 'CriticalChance', 'CriticalDamage', 'Resistance', 'Accuracy'][i], weight));
    }

    if (this.settings.preferredSet) {
      // By making the base weight for a set so high, it's very unlikely it won't try to fill with the set (unless not possible)
      result.push(new StatValue(this.settings.preferredSet, totalWeight * 9 * 2));
    }

    return result;
  }

  weightDisplay(value: number): string {
    if (value) {
      return `+${value}`;
    } else {
      return 'NI';
    }
  }
}
