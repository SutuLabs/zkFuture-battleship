type ShipType = [bigint, bigint, bigint];
export type ShipBoard = [ShipType, ShipType, ShipType, ShipType, ShipType];
export interface BoardProof {
  boardHash: bigint;
  a: [bigint, bigint];
  b: [[bigint, bigint], [bigint, bigint]];
  c: [bigint, bigint];
}

export interface AttackProof {
  hitShip: bigint;
  a: [bigint, bigint];
  b: [[bigint, bigint], [bigint, bigint]];
  c: [bigint, bigint];
}

export async function getBoardProof(shipBoard: ShipBoard): Promise<BoardProof> {
  const { proof, publicSignals } = await window.snarkjs.groth16.fullProve(
    {
      ships: shipBoard,
      trapdoor: '123121',
    },

    'circuits/BoardEligibility.wasm',
    'circuits/BoardEligibility_final.zkey'
  );

  const ep = await window.snarkjs.groth16.exportSolidityCallData(
    proof,
    publicSignals
  );
  const eep = JSON.parse('[' + ep + ']');

  return {
    boardHash: eep[3][0],
    a: eep[0],
    b: eep[1],
    c: eep[2],
  };
}

export async function getAttackProof(
  shipBoard: ShipBoard,
  boardHash: bigint,
  shotIndex: bigint
): Promise<AttackProof> {
  const { proof, publicSignals } = await window.snarkjs.groth16.fullProve(
    {
      hash: boardHash,
      ships: shipBoard,
      trapdoor: '123121',
      shotIndex,
    },

    'circuits/RevealAttack.wasm',
    'circuits/RevealAttack_final.zkey'
  );

  const ep = await window.snarkjs.groth16.exportSolidityCallData(
    proof,
    publicSignals
  );
  const eep = JSON.parse('[' + ep + ']');

  return {
    hitShip: eep[3][0],
    a: eep[0],
    b: eep[1],
    c: eep[2],
  };
}
