const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  classifyTitle,
  getMatchBucket,
  mapFailureModeToSymptom,
} = require('../src/services/problemClassifyService');
const { getSeedPhrases } = require('../src/services/problemPhraseSeed');

const phrases = getSeedPhrases();

describe('problemClassifyService', () => {
  it('maps gripper station variants to the same part and symptom', () => {
    const a = classifyTitle('Gripper s#2 L L โยก', phrases);
    const b = classifyTitle('Gripper s#3 L L โยกคลอน', phrases);
    assert.equal(a.part, 'gripper');
    assert.equal(a.symptom, 'loose');
    assert.equal(b.part, 'gripper');
    assert.equal(b.symptom, 'loose');
    assert.equal(a.station, '2');
    assert.equal(b.station, '3');
  });

  it('maps air-cut wording variants to air_cut + broken', () => {
    const a = classifyTitle('สายair cut Lแตก', phrases);
    const b = classifyTitle('สายลม pilot valve air cut L แตก', phrases);
    assert.equal(a.part, 'air_cut');
    assert.equal(a.symptom, 'broken');
    assert.equal(b.part, 'air_cut');
    assert.equal(b.symptom, 'broken');
  });

  it('treats hyphen as a space for rod end', () => {
    const result = classifyTitle('Rod- end bottom คลอน', phrases);
    assert.equal(result.part, 'rod_end');
    assert.equal(result.symptom, 'loose');
  });

  it('prefers longer roller gripper over gripper', () => {
    const result = classifyTitle('roller gripper worn', phrases);
    assert.equal(result.part, 'roller_gripper');
    assert.equal(result.symptom, 'worn');
  });

  it('classifies part-only, symptom-only, and no-match buckets', () => {
    const partOnly = classifyTitle('Belt', phrases);
    const symptomOnly = classifyTitle('CW leak', phrases);
    const none = classifyTitle('test test', phrases);

    assert.equal(partOnly.part, 'belt');
    assert.equal(partOnly.symptom, null);
    assert.equal(getMatchBucket(partOnly), 'part_only');

    assert.equal(symptomOnly.part, null);
    assert.equal(symptomOnly.symptom, 'leak');
    assert.equal(getMatchBucket(symptomOnly), 'symptom_only');

    assert.equal(none.part, null);
    assert.equal(none.symptom, null);
    assert.equal(getMatchBucket(none), 'none');
  });

  it('marks full match when both codes exist', () => {
    const result = classifyTitle('valve leak', phrases);
    assert.equal(result.part, 'valve');
    assert.equal(result.symptom, 'leak');
    assert.equal(getMatchBucket(result), 'full');
    assert.equal(result.matched, true);
  });

  it('maps common FailureModeCode values to symptom codes', () => {
    assert.equal(mapFailureModeToSymptom('BROKEN'), 'broken');
    assert.equal(mapFailureModeToSymptom('me12'), 'leak');
    assert.equal(mapFailureModeToSymptom('ME21'), 'worn');
    assert.equal(mapFailureModeToSymptom('LOOSEN'), 'loose');
    assert.equal(mapFailureModeToSymptom('ME13'), 'loose');
    assert.equal(mapFailureModeToSymptom('ME14'), 'stuck');
    assert.equal(mapFailureModeToSymptom('UNBALANCE'), 'vibration');
    assert.equal(mapFailureModeToSymptom('None'), null);
    assert.equal(mapFailureModeToSymptom(null), null);
    assert.equal(mapFailureModeToSymptom('UNKNOWN_XYZ'), null);
  });

  it('fills missing title symptom from failure mode, with source failure_mode', () => {
    const result = classifyTitle('Belt', phrases, { failureModeCode: 'ME12' });
    assert.equal(result.part, 'belt');
    assert.equal(result.symptom, 'leak');
    assert.equal(result.symptomSource, 'failure_mode');
    assert.equal(getMatchBucket(result), 'full');
  });

  it('keeps title symptom over failure mode when both exist', () => {
    const result = classifyTitle('valve leak', phrases, { failureModeCode: 'BROKEN' });
    assert.equal(result.part, 'valve');
    assert.equal(result.symptom, 'leak');
    assert.equal(result.symptomSource, 'title');
  });

  it('uses failure mode alone when title has no part or symptom', () => {
    const result = classifyTitle('CW issue', phrases, { failureModeCode: 'BROKEN' });
    assert.equal(result.part, null);
    assert.equal(result.symptom, 'broken');
    assert.equal(result.symptomSource, 'failure_mode');
    assert.equal(getMatchBucket(result), 'symptom_only');
  });
});
