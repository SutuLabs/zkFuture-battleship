<template>
  <q-page class="">
    <q-splitter v-model="splitterModel" :limits="[50, 50]">
      <template v-slot:before>
        <div class="q-pa-md">
          <div class="text-h4 q-mb-md">Circom Code</div>
          <q-input
            v-model="input"
            type="textarea"
            outlined
            input-style="height: 80vh;"
          />
        </div>
      </template>

      <template v-slot:separator>
        <q-btn
          color="primary"
          text-color="white"
          size="lg"
          label="Convert"
          push
          @click="convert()"
        />
      </template>

      <template v-slot:after>
        <div class="q-pa-md">
          <div class="text-h4 q-mb-md">Generated Script</div>
          <q-input
            v-model="output"
            type="textarea"
            outlined
            input-style="height: 80vh;"
          />
        </div>
      </template>
    </q-splitter>
  </q-page>
</template>

<script setup lang="ts">
import MainLayout from 'src/layouts/MainLayout.vue';
import { ref } from 'vue';

const splitterModel = ref(50);
const input = ref(
  `pragma circom 2.0.0;

include "../../node_modules/circomlib/circuits/bitify.circom";
include "../../node_modules/circomlib/circuits/mimcsponge.circom";

include "./templates/shiphit.circom";

template RevealAttack() {
    // The x, y, z of ship positions.
    signal input ships[5][3];
    // A user held secret that prevents others from brute forcing the board's configuration
    signal input trapdoor;

    signal input hash;

    // The linearized coordinate of the player's shot.
    signal input shotIndex;

    signal output hitShipId;

    // The length of each ship in the order used.
    var lengths[5] = [5, 4, 3, 3, 2];

    // Verify that the specified ship configuration matches with that of the committed hash.
    component hasher = MiMCSponge(16, 220, 1);
    hasher.k <== 0;
    hasher.ins[15] <== trapdoor;
    for (var i = 0; i < 15; i++) {
        hasher.ins[i] <== ships[i \ 3][i % 3];
    }

    hasher.outs[0] === hash;

    // Compute which ship the shot hit.
    // Use "<--" on shotIndex here to avoid snarkjs bug with proof completeness.
    // TODO: Investigate snarkjs bug.
    signal shot[2];
    shot[1] <-- shotIndex \ 10;
    shot[0] <== shotIndex - shot[1] * 10;

    shot[1] * 10 + shot[0] === shotIndex;

    component shipHits[5];
    component shipBitlistToInteger = Bits2Num_strict();

    for (var i = 0; i < 5; i++) {
        shipHits[i] = ShipHit(lengths[i]);
        shipHits[i].ship[0] <== ships[i][0];
        shipHits[i].ship[1] <== ships[i][1];
        shipHits[i].ship[2] <== ships[i][2];
        shipHits[i].shot[0] <== shot[0];
        shipHits[i].shot[1] <== shot[1];

        shipBitlistToInteger.in[i] <== shipHits[i].hit;
    }

    // Output the ship hit bitlist as an integer.
    for (var i = 5; i < 254; i++) {
        shipBitlistToInteger.in[i] <== 0;
    }

    hitShipId <== shipBitlistToInteger.out;
}

component main { public [hash, shotIndex] } = RevealAttack();`.replaceAll(
    '\r',
    ''
  )
);

const output = ref('');
function convert() {
  output.value = genCode(input.value);
}

const reIo = /signal\s+(input|output)\s+([\d\w]+)((\[\d+\])*);/g;
const reMain =
  /component\s+main\s*(\{\s*public\s*\[([\w\d,\s]+)+\]\s*\})?\s*=\s*([\d\w]+)\(\);/g;

interface IoType {
  name: string;
  array: number[];
  type: 'input' | 'output';
}

function genCode(input: string): string {
  const lines = input.split('\n');

  const vin: IoType[] = [];
  const vout: IoType[] = [];
  let mainname = '';
  for (var i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const iomatches = reIo.exec(line);
    // console.log(line, iomatches)
    if (iomatches) {
      const io = iomatches[1];
      const name = iomatches[2];
      const arr = iomatches[3] ?? '';
      const array = arr
        .split('][')
        .map((_) => _.replaceAll('[', '').replaceAll(']', ''))
        .filter((_) => _)
        .map((_) => Number(_));
      // console.log(io, name, arr);
      const iot: IoType = {
        name,
        array,
        type: io == 'input' ? 'input' : 'output',
      };
      if (io == 'input') {
        vin.push(iot);
      } else if (io == 'output') {
        vout.push(iot);
      }
    }

    const mainmatches = reMain.exec(line);
    if (mainmatches) {
      const parsraw = mainmatches[2];
      if (parsraw) {
        // console.log(parsraw);
        const pars = parsraw.split(',').map((_) => _.trim());
        for (let i = 0; i < pars.length; i++) {
          const par = pars[i];
          const p = vin.filter((_) => _.name == par)[0];
          // console.log('pp', par, p);
          vout.push(p);
        }
      }

      const name = mainmatches[3];
      mainname = name;
    }
  }

  // console.log(vin, vout, mainname);

  let tin = '';
  for (let i = 0; i < vin.length; i++) {
    const v = vin[i];
    tin += `  ${v.name}: ${getArrayType(v.array)},\n`;
  }

  let tout = '';
  for (let i = 0; i < vout.length; i++) {
    const v = vout[i];
    tout += `  ${v.name}: ${getArrayType(v.array)},\n`;
  }

  let valout = '';
  let pos = 0;
  for (let i = 0; i < vout.length; i++) {
    const v = vout[i];
    if (v.type == 'input') {
      valout += `    ${v.name},\n`;
    } else {
      valout += `    ${v.name}: eep[3][${pos}],\n`;
      pos++;
    }
  }

  const t = `export async function get${mainname}Proof(
${tin}
): Promise<{
${tout}
  a: [bigint, bigint];
  b: [[bigint, bigint], [bigint, bigint]];
  c: [bigint, bigint];
}> {
  const { proof, publicSignals } = await window.snarkjs.groth16.fullProve(
    { ships, trapdoor },
    'circuits/${mainname}.wasm',
    'circuits/${mainname}_final.zkey'
  );

  const ep = await window.snarkjs.groth16.exportSolidityCallData(
    proof,
    publicSignals
  );
  const eep = JSON.parse('[' + ep + ']');

  return {
${valout}
    a: eep[0],
    b: eep[1],
    c: eep[2],
  };
}`;
  return t;
}

const arrayTypeSplitter = ', ';
function getArrayType(arr: number[]): string {
  if (arr.length == 0) return 'bigint';
  let c = '[';
  for (let i = 0; i < arr[0]; i++) {
    const nestType = getArrayType(arr.slice(1));
    c +=
      nestType +
      (i == arr[0] - 1 ? '' : arrayTypeSplitter) +
      (arr.length == 1 ? '' : '\n');
  }
  c += ']';
  return c;
}
</script>
