<template>
  <div>
    <div v-if="gameMode == 'Setup'" class="row">
      <div class="col">
        <q-card class="q-ma-lg">
          <q-card-section class="bg-primary text-white">
            <div class="text-h6">Deploy your fleet</div>
            <!-- <div class="text-subtitle2">by John Doe</div> -->
          </q-card-section>

          <q-separator />

          <q-list bordered separator>
            <q-item clickable v-ripple v-for="ship in ships" :key="ship.id">
              <q-item-section>
                <q-item-label>
                  <img
                    :src="'/images/' + ship.id + '.svg'"
                    :width="ship.length * 32"
                  />
                  <div class="float-right">{{ ship.name }}</div>
                </q-item-label>
                <!-- <q-item-label caption class="float-right">{{ ship.name }}</q-item-label> -->
                <q-item-label>
                  <div class="row">
                    <div class="cell" v-for="i of ship.length" :key="i"></div>
                  </div>
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>
      <div class="col">
        <q-card class="q-ma-lg">
          <q-card-section class="bg-secondary text-white">
            <div class="text-h6">Your fleet</div>
            <!-- <div class="text-subtitle2">by John Doe</div> -->
          </q-card-section>

          <q-separator />
          <q-card-section>
            <div class="map" @click="clickOnMapEmpty()">
              <div class="row" v-for="y of 10" :key="'y-' + y">
                <div
                  class="cell hoverable"
                  v-for="x of 10"
                  :key="x + '|' + y"
                  @click="clickOnMap(x, y)"
                >
                  <template v-for="(ship, id) of fleet">
                    <div
                      v-if="
                        x == ship.x &&
                        y == ship.y &&
                        ships.filter((_) => _.id == id)[0]
                      "
                      :key="id"
                    >
                      <img
                        :src="'/images/' + id + '.svg'"
                        :width="ships.filter((_) => _.id == id)[0].length * 32"
                        class="overlay-ship"
                        :class="{ rotate: ship.z == 1 }"
                      />
                    </div>
                  </template>
                </div>
              </div>
              <q-menu touch-position>
                <div class="no-wrap q-pa-md">
                  <div v-if="selX > -1 && selY > -1" class="text-h6">
                    ({{ selX }}, {{ selY }})
                  </div>
                  <!-- <div v-else class="text-h6">Nothing selected</div> -->
                  <div v-else class="text-h6">(?, ?)</div>
                </div>
                <template v-if="selFleetShip">
                  <div class="row no-wrap q-pa-md">
                    <q-toggle v-model="selZ" label="Rotate" />

                    <q-separator vertical inset class="q-mx-lg" />

                    <div class="column items-center">
                      <img
                        height="16"
                        :src="'/images/' + selFleetShip + '.svg'"
                      />

                      <div class="q-mt-md q-mb-xs">
                        {{ ships.filter((_) => _.id == selFleetShip)[0]?.name }}
                      </div>

                      <q-btn
                        color="negative"
                        label="Remove"
                        push
                        size="sm"
                        v-close-popup
                        @click="remove(selFleetShip)"
                      />
                    </div>
                  </div> </template
                ><template
                  v-if="
                    !selFleetShip &&
                    undeployedFleetShips.length > 0 &&
                    selX > -1 &&
                    selY > -1
                  "
                >
                  <div class="q-pa-md">
                    <template v-for="ship in undeployedFleetShips" :key="ship">
                      <q-btn
                        color="secondary"
                        push
                        class="q-mt-sm"
                        :label="ships.filter((_) => _.id == ship)[0]?.name"
                        :icon="'img:/images/' + ship + '.svg'"
                        @click="deploy(ship)"
                      />
                      <br />
                    </template>
                  </div>
                </template>
              </q-menu>
            </div>
          </q-card-section>

          <q-card-section class="bg-green-1 text-white">
            <q-btn
              color="secondary"
              label="Host New Game"
              class="full-width"
              icon="flag"
              push
              @click="submit()"
            />
            <q-input v-model="gameId" label="Game ID" type="number">
              <template v-slot:after>
                <q-btn
                  color="primary"
                  push
                  label="Join Game"
                  icon="send"
                  @click="join(BigInt(gameId))"
                />
              </template>
            </q-input>
          </q-card-section>

          <q-card-section class="">
            <q-list bordered>
              <q-item-label header
                >Onchain Games
                <q-btn
                  flat
                  rounded
                  icon="refresh"
                  size="sm"
                  @click="refreshList()"
                />
              </q-item-label>

              <q-item
                v-for="game in gameList"
                :key="game.id.toString()"
                class="q-mb-sm"
                clickable
                @click="clickGame(game.id)"
                v-ripple
              >
                <q-item-section avatar>
                  <q-avatar>
                    <q-icon
                      :name="
                        game.status == 'MY-GAMING'
                          ? 'sports_esports'
                          : game.status == 'WAITJOIN'
                          ? 'rocket_launch'
                          : game.status == 'WAITOTHER'
                          ? 'pending'
                          : game.status == 'WIN'
                          ? 'sports_score'
                          : game.status == 'OTHER-GAMING'
                          ? 'visibility'
                          : ''
                      "
                    />
                  </q-avatar>
                </q-item-section>

                <q-item-section>
                  <q-item-label>{{ game.title }}</q-item-label>
                  <q-item-label caption lines="1"
                    >ID: {{ game.id }}, {{ game.subtitle }}</q-item-label
                  >
                </q-item-section>
              </q-item>

              <q-inner-loading :showing="isListRefreshing">
                <q-spinner-gears size="50px" color="primary" />
              </q-inner-loading>
            </q-list>
          </q-card-section>
        </q-card>
      </div>
    </div>
    <div v-if="gameMode == 'Attack'" class="row">
      <div class="col">
        <q-card class="q-ma-lg">
          <q-card-section class="bg-negative text-white">
            <div class="text-h6">
              Opponent's fleet
              <q-btn flat rounded icon="refresh" @click="refreshGame()" />
            </div>
          </q-card-section>

          <q-separator />
          <q-card-section>
            <div class="map">
              <div class="row" v-for="y of 10" :key="'y-' + y">
                <div
                  class="cell hoverable"
                  v-for="x of 10"
                  :key="x + '|' + y"
                  @click="attack(x, y)"
                >
                  <img
                    v-if="opTurns[x + '|' + y]"
                    :src="'/images/' + opTurns[x + '|' + y] + '.svg'"
                    class="overlay-bomb"
                  />
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col">
        <q-card class="q-ma-lg">
          <q-card-section class="bg-secondary text-white">
            <div class="text-h6">Your fleet</div>
          </q-card-section>

          <q-separator />
          <q-card-section>
            <div class="map">
              <div class="row" v-for="y of 10" :key="'y-' + y">
                <div class="cell hoverable" v-for="x of 10" :key="x + '|' + y">
                  <template v-for="(ship, id) of fleet" :key="id">
                    <img
                      v-if="myTurns[x + '|' + y]"
                      :src="'/images/' + myTurns[x + '|' + y] + '.svg'"
                      class="overlay-bomb"
                    />
                    <div
                      v-if="
                        x == ship.x &&
                        y == ship.y &&
                        ships.filter((_) => _.id == id)[0]
                      "
                    >
                      <img
                        :src="'/images/' + id + '.svg'"
                        :width="ships.filter((_) => _.id == id)[0].length * 32"
                        class="overlay-ship"
                        :class="{ rotate: ship.z == 1 }"
                      />
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, Ref } from 'vue';
// import { Todo, Meta } from './models';
import { ethers, JsonRpcSigner } from 'ethers';
import { Game__factory } from 'src/contracts';
// import { JsonRpcSigner, Web3Provider } from '@ethersproject/providers';
// import { JsonRpcSigner, Web3Provider } from 'ethers';
import {
  QSpinnerClock,
  QSpinnerComment,
  QSpinnerGears,
  QSpinnerRadio,
  useQuasar,
} from 'quasar';
import {
  getAttackProof,
  getBoardProof,
  ShipBoard,
} from 'src/services/gameProof';
import { ShipInfo } from 'src/services/shipData';
import {
  convertShots,
  convertToGameState,
  GameState,
} from 'src/services/gameInfo';

const $q = useQuasar();
// interface Props {
//   title: string;
//   todos?: Todo[];
//   meta: Meta;
//   active: boolean;
// }
// const props = withDefaults(defineProps<Props>(), {
//   todos: () => [],
// });

const gameId = ref(1);

const gameMode: Ref<'Setup' | 'Attack'> = ref('Setup');
const ships = ShipInfo;
const shipDict = Object.assign({}, ...ships.map((x) => ({ [x.id]: x })));

const fleet: Ref<{ [key: string]: { x: number; y: number; z: -1 | 0 | 1 } }> =
  ref({
    carrier: { x: 1, y: 1, z: 0 },
    battleship: { x: 3, y: 3, z: 1 },
    cruiser: { x: 5, y: 2, z: 1 },
    submarine: { x: 8, y: 5, z: 0 },
    destroyer: { x: 6, y: 7, z: 0 },
    // carrier: { x: -1, y: -1, z: -1 },
    // battleship: { x: -1, y: -1, z: -1 },
    // cruiser: { x: -1, y: -1, z: -1 },
    // submarine: { x: -1, y: -1, z: -1 },
    // destroyer: { x: -1, y: -1, z: -1 },
  });

const selX = ref(-1);
const selY = ref(-1);

function clickOnMapEmpty() {
  // console.log('clickOnMapEmpty');
  selX.value = -1;
  selY.value = -1;
}
function clickOnMap(x: number, y: number) {
  setTimeout(() => {
    // console.log('clickOnMap', x, y);
    selX.value = x;
    selY.value = y;
  }, 100);
}

function deploy(id: string | undefined) {
  if (!id || !fleet.value.hasOwnProperty(id)) return;
  const ship = fleet.value[id];
  ship.x = selX.value;
  ship.y = selY.value;
  ship.z = 0;
}

function remove(id: string | undefined) {
  if (!id || !fleet.value.hasOwnProperty(id)) return;
  const ship = fleet.value[id];
  ship.x = -1;
  ship.y = -1;
  ship.z = -1;
}

const selFleetShip = computed(() => {
  return Object.entries(fleet.value)
    .filter((pair) => pair[1].x == selX.value && pair[1].y == selY.value)
    .filter((pair) => pair[1].x != -1 && pair[1].y != -1)
    .at(0)?.[0];
});
const undeployedFleetShips = computed(() => {
  return Object.entries(fleet.value)
    .filter((pair) => pair[1].x == -1 && pair[1].y == -1)
    .map((_) => _[0]);
});
const selZ = computed({
  get(): boolean {
    const sfs = selFleetShip.value;
    const z = !sfs
      ? undefined
      : !fleet.value.hasOwnProperty(sfs)
      ? undefined
      : fleet.value[sfs]?.z;
    return z == 1;
  },
  set(newValue: boolean) {
    const sfs = selFleetShip.value;
    console.log('set0', sfs, newValue);
    if (!sfs || !fleet.value.hasOwnProperty(sfs)) return;
    console.log('set', sfs, newValue, fleet.value[sfs].z);
    fleet.value[sfs].z = newValue ? 1 : 0;
  },
});

const shipBoard = computed((): ShipBoard => {
  const ships = Object.entries(fleet.value)
    .map(([key, val]) => [shipDict[key].proofId, [val.x - 1, val.y - 1, val.z]])
    .sort((b, a) => a[0] - b[0]) // reverse order
    .map((_) => _[1]);
  return [ships[0], ships[1], ships[2], ships[3], ships[4]];
});

const account = ref('');

let signer: JsonRpcSigner | null = null;

let provider;
if (window.ethereum == null) {
  // // If MetaMask is not installed, we use the default provider,
  // // which is backed by a variety of third-party services (such
  // // as INFURA). They do not have private keys installed so are
  // // only have read-only access
  // console.log('MetaMask not installed; using read-only defaults');
  // // provider = ethers.getDefaultProvider();
  // provider = (ethers as any).getDefaultProvider();
  console.log('metamask not found');
} else {
  // Connect to the MetaMask EIP-1193 object. This is a standard
  // protocol that allows Ethers access to make all read-only
  // requests through MetaMask.
  provider = new ethers.BrowserProvider(window.ethereum, 1287);
  // const RPC_HOST = 'https://moonbase-alpha.public.blastapi.io/';
  // provider = new ethers.JsonRpcProvider(RPC_HOST);
  // provider = new Web3Provider(window.ethereum);

  // It also provides an opportunity to request access to write
  // operations, which will be performed by the private key
  // that MetaMask manages for the user.
  signer = await provider.getSigner();
  // console.log('get signer', provider, signer);

  // let accounts = await provider.send("eth_requestAccounts", []);
  // account.value = accounts[0];
  account.value = await signer.getAddress();
}

const g = Game__factory.connect(
  // '0x0327BdBc3cE56723B5319D90E106685755f42A8f',
  '0xff5284C5F427F0e33c40426F848e1148367cFf56',
  signer
);

const gameList: Ref<GameState[]> = ref([]);
const isListRefreshing = ref(false);

refreshList();

async function refreshList() {
  try {
    isListRefreshing.value = true;
    // console.log('get game index');
    const gi = await g.gameIndex();
    // console.log('index', gi);
    const arr = [];
    for (let i = Math.max(Number(gi) - 5, 0); i < gi; i++) {
      const gs = await g.gameState(i);
      // console.log('gs', gs);
      // const gg = await g.games(i);
      // console.log('gg', gg);
      arr.push(convertToGameState(gs, account.value, BigInt(i)));
    }
    gameList.value = arr;
  } finally {
    isListRefreshing.value = false;
  }
}

async function clickGame(id: bigint) {
  const game = gameList.value.filter((_) => _.id == id)[0];
  if (!game) return;
  switch (game.status) {
    case 'MY-GAMING':
      refreshGame(id);
      break;
    case 'WAITOTHER':
      $q.notify('Please wait other to join');
      break;
    case 'WAITJOIN':
      join(id);
      break;

    default:
      $q.notify('Not support');
      break;
  }
}

async function submit() {
  try {
    $q.loading.show({
      message: 'Generating Proof...',
      boxClass: 'bg-grey-2 text-grey-9',
      spinnerColor: 'primary',
      spinner: QSpinnerGears,
    });
    const p = await getBoardProof(shipBoard.value);

    $q.loading.show({
      message: 'Submitting Transaction',
      boxClass: 'bg-grey-2 text-grey-9',
      spinnerColor: 'secondary',
      spinner: QSpinnerComment,
    });
    const t = await g.startGame(p.boardHash, p.a, p.b, p.c);

    $q.loading.show({
      message: 'Waiting Transaction to be included in Blockchain',
      boxClass: 'bg-grey-2 text-grey-9',
      spinnerColor: 'primary',
      spinner: QSpinnerClock,
    });
    await t.wait();

    // delay refresh due to RPC may not see this transaction such fast
    setTimeout(() => {
      refreshList();
    }, 4000);
  } finally {
    $q.loading.hide();
  }
}

async function join(id: bigint) {
  try {
    $q.loading.show({
      message: 'Generating Proof...',
      boxClass: 'bg-grey-2 text-grey-9',
      spinnerColor: 'primary',
      spinner: QSpinnerGears,
    });
    const p = await getBoardProof(shipBoard.value);

    $q.loading.show({
      message: 'Submitting Transaction',
      boxClass: 'bg-grey-2 text-grey-9',
      spinnerColor: 'secondary',
      spinner: QSpinnerComment,
    });
    const t = await g.joinGame(id, p.boardHash, p.a, p.b, p.c);

    $q.loading.show({
      message: 'Waiting Transaction to be included in Blockchain',
      boxClass: 'bg-grey-2 text-grey-9',
      spinnerColor: 'primary',
      spinner: QSpinnerClock,
    });
    await t.wait();

    refreshGame(id);
  } finally {
    $q.loading.hide();
  }
}

// ======================== Attack Page

const curGame: Ref<GameState | undefined> = ref(undefined);
const curPlayerIndex = ref(0);
const prevTurnShotIndex = ref(-1);
const isMyTurn = ref(false);

type Turn = {
  [key: string]: 'miss' | 'hit';
};

const opTurns: Ref<Turn> = ref({
  '1|1': 'miss',
  '4|5': 'miss',
  '5|6': 'miss',
  '6|5': 'hit',
  '6|6': 'hit',
  '6|7': 'hit',
  '6|8': 'miss',
});

const myTurns: Ref<Turn> = ref({
  '1|2': 'miss',
  '7|5': 'miss',
  '8|6': 'miss',
  '5|2': 'hit',
  '5|3': 'hit',
  '5|4': 'hit',
  '7|9': 'miss',
});

async function refreshGame(id: bigint | undefined) {
  try {
    if (id === undefined) id = curGame.value?.id;
    if (id === undefined) return;

    $q.loading.show({
      message: 'Retrieving Game State...',
      boxClass: 'bg-grey-2 text-grey-9',
      spinnerColor: 'primary',
      spinner: QSpinnerRadio,
    });

    const gsraw = await g.gameState(id);
    const game = convertToGameState(gsraw, account.value, BigInt(id));
    if (
      game.participants[0] == game.participants[1] &&
      game.participants[0] == '0x0000000000000000000000000000000000000000'
    )
      return;

    curGame.value = game;

    $q.loading.show({
      message: 'Retrieving bullets...',
      boxClass: 'bg-grey-2 text-grey-9',
      spinnerColor: 'primary',
      spinner: QSpinnerRadio,
    });
    const gs = await g.shots(id);
    const [p1s, p2s, p1h, p2h] = gs;
    const pShots = [p1s, p2s];
    const pHits = [p1h, p2h];

    // truth table:
    // PlayerIndex, Modulo, isMyTurn
    // 0, 1, 1
    // 0, 0, 0
    // 1, 1, 0
    // 1, 0, 1
    curPlayerIndex.value = game.participants[0] == account.value ? 0 : 1;
    isMyTurn.value =
      Number(game.turn) % 2 ^ curPlayerIndex.value ? true : false;

    myTurns.value = convertShots(
      pShots[1 - curPlayerIndex.value],
      pHits[1 - curPlayerIndex.value]
    );
    opTurns.value = convertShots(
      pShots[curPlayerIndex.value],
      pHits[curPlayerIndex.value]
    );

    // console.log(
    //   JSON.stringify(opTurns.value),
    //   pShots[1 - curPlayerIndex.value],
    //   pHits
    // );
    // console.log(JSON.stringify(myTurns.value), pShots[curPlayerIndex.value]);

    if (game.turn > 1 && isMyTurn.value)
      prevTurnShotIndex.value = pShots[1 - curPlayerIndex.value]
        .map((val, idx) => ({ idx, val }))
        .filter((_) => _.val == game.turn - 1n)[0].idx;

    gameMode.value = 'Attack';
  } catch (err) {
    console.warn('unable to refresh game', err);
  } finally {
    $q.loading.hide();
  }
}

function attack(x: number, y: number) {
  if (!isMyTurn.value) {
    $q.notify('Not your turn.');
  } else {
    $q.dialog({
      title: 'Confirm',
      message: `Attack (${x}, ${y}), confirm?`,
      cancel: true,
      persistent: true,
    }).onOk(() => {
      attackAction(x - 1 + (y - 1) * 10);
    });
  }
}

async function attackAction(shotIndex: number) {
  try {
    const game = curGame.value;
    if (!game) return;

    let t;
    if (game.turn == 1n) {
      $q.loading.show({
        message: 'Submitting Transaction',
        boxClass: 'bg-grey-2 text-grey-9',
        spinnerColor: 'secondary',
        spinner: QSpinnerComment,
      });
      t = await g.playFirstTurn(game.id, shotIndex);
    } else {
      $q.loading.show({
        message: 'Generating Proof...',
        boxClass: 'bg-grey-2 text-grey-9',
        spinnerColor: 'primary',
        spinner: QSpinnerGears,
      });
      const p = await getAttackProof(
        shipBoard.value,
        game.boards[curPlayerIndex.value],
        BigInt(prevTurnShotIndex.value)
      );

      $q.loading.show({
        message: 'Submitting Transaction',
        boxClass: 'bg-grey-2 text-grey-9',
        spinnerColor: 'secondary',
        spinner: QSpinnerComment,
      });
      console.log(
        game.id,
        p.hitShip,
        prevTurnShotIndex.value,
        shotIndex,
        p.a,
        p.b,
        p.c
      );
      t = await g.playTurn(
        game.id,
        p.hitShip,
        prevTurnShotIndex.value,
        shotIndex,
        p.a,
        p.b,
        p.c
      );
    }

    $q.loading.show({
      message: 'Waiting Transaction to be included in Blockchain',
      boxClass: 'bg-grey-2 text-grey-9',
      spinnerColor: 'primary',
      spinner: QSpinnerClock,
    });
    await t.wait();

    // delay refresh due to RPC may not see this transaction such fast
    setTimeout(() => {
      refreshGame(game.id);
    }, 4000);
  } finally {
    $q.loading.hide();
  }
}
</script>

<style lang="scss" scoped>
.cell {
  width: 28px;
  height: 28px;
  margin: 2px;
  background-color: wheat;
  border: 2px solid #777;
  position: relative;

  &.hoverable:hover {
    background-color: orange;
  }

  .overlay-ship {
    position: relative;
    left: -4px;
    z-index: 100;
    height: 28px;
    object-fit: cover;
    top: -4px;
    &.rotate {
      transform: rotate(90deg);
      transform-origin: 0% 100%;
      top: -34px;
    }
  }
  .overlay-bomb {
    position: absolute;
    left: 0px;
    top: 0px;
    height: 24px;
    width: 24px;
    z-index: 110;
  }
}
</style>
