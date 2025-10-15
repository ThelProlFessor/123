

interface Controls {
  positive: boolean;
  negative: boolean;
  ntc: boolean;
}

// This is the exact 32-color sequence from the valid .smp file provided by the user.
// It will be cycled through for the 72 positions.
const ROTOR_GENE_COLORS = [
  255, 51400, 16711680, 8388736, 16744703, 16744448, 8421376, 8421631, 1677088, 16711935,
  197379, 13158400, 8504538, 8510085, 13491072, 14395776, 14450322, 14515654, 11893982,
  174, 96685, 109955, 10267905, 11433472, 11403264, 11338136, 6553774, 14013909, 12566463,
  9803157, 7697781, 5526612
];


export const generateFinalList = (patientSamples: string[], controls: Controls): string[] => {
  const finalList: string[] = [];
  const POS_CONTROL_ID = "POS-";
  const NEG_CONTROL_ID = "NEG Cont";
  const NTC_ID = "NTC";

  const hasPatients = patientSamples.length > 0;
  const anyControlSelected = controls.positive || controls.negative || controls.ntc;

  if (!hasPatients && !anyControlSelected) {
    return [];
  }
  
  const numberOfMixes = 8;

  if (anyControlSelected) {
    // Logic for runs that include any type of control
    for (let i = 1; i <= numberOfMixes; i++) {
      if (controls.positive) {
        finalList.push(`${POS_CONTROL_ID}${i}`);
      }
      if (controls.negative) {
        finalList.push(NEG_CONTROL_ID);
      }
      finalList.push(...patientSamples);
      if (controls.ntc) {
        finalList.push(NTC_ID);
      }
    }
  } else if (hasPatients) {
    // Logic for runs with only patient samples (no controls)
    for (let i = 1; i <= numberOfMixes; i++) {
      // Suffix is only added to the first patient of each mix group.
      const firstPatientWithMix = `${patientSamples[0]}-Mix ${i}`;
      const restOfPatients = patientSamples.slice(1);
      finalList.push(firstPatientWithMix, ...restOfPatients);
    }
  }
  
  return finalList;
};

export const generateXml = (sampleNames: string[]): string => {
  const maxSamples = 72;
  
  const generateSampleTag = (index: number): string => {
    const name = sampleNames[index] || '';
    const selected = name ? 'True' : 'False';
    const tubePosition = index + 1;
    const color = ROTOR_GENE_COLORS[index % ROTOR_GENE_COLORS.length];

    // Using template literals with proper indentation
    return `
<Sample>
<ID>${tubePosition}</ID>
<Name>${name}</Name>
<Type>2</Type>
<GivenConc>0</GivenConc>
<Selected>${selected}</Selected>
<Color>${color}</Color>
<TubePosition>${tubePosition}</TubePosition>
<LinePattern>0</LinePattern>
<ReadOnly>False</ReadOnly>
</Sample>`;
  };

  const allSampleTags = Array.from({ length: maxSamples }, (_, i) => generateSampleTag(i)).join('');

  const xmlContent = `<?xml version='1.0' encoding='utf-8'?>
<ExperimentSamples>
<RexHeader>3.15</RexHeader>
<Samples>
<TranslatedRows>False</TranslatedRows>
<Format>General Number</Format>
<ConcentrationUnit>copies/ul</ConcentrationUnit>
<IDFormat>1</IDFormat>
<SyncPages>False</SyncPages>
<ReadOnly>False</ReadOnly>
<Page>
<Name>Flu/RSV</Name>
<Suitabilities>
<SuitableForAll>True</SuitableForAll>
</Suitabilities>${allSampleTags}
</Page>
<Groups />
<CustomColumns />
<HiddenColumns />
</Samples>
</ExperimentSamples>`;

  return xmlContent.trim();
};