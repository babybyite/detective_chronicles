import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  ImageBackground,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  View
} from "react-native";
import type { ImageSourcePropType, LayoutChangeEvent, StyleProp, ViewStyle } from "react-native";
import {
  downloadRavenwoodModel,
  generateRavenwoodOfflineReply,
  getRavenwoodModelStatus,
  loadRavenwoodModel,
  validateRavenwoodAiReply
} from "./ravenwoodAiEngine";
import type { RavenwoodModelStatus, RavenwoodValidatedAiReply } from "./ravenwoodAiEngine";
import {
  ravenwoodGuestPortraitAssets,
  ravenwoodPlayerPortraitAssets,
  ravenwoodStaffPortraitAssets
} from "./ravenwoodPortraitAssets";
import type { MysteryVisualRace, RavenwoodGuestPortraitAsset } from "./ravenwoodPortraitAssets";

type ThemeName = "dark" | "pastel";
type Screen = "menu" | "load" | "past" | "medals" | "settings" | "mysteryBookSelect" | "mysteryDetectiveSelect" | "mysteryPortraitSelect" | "mystery" | "mysteryCharacter" | "mysteryRelations" | "mysteryFamilyTree" | "mysteryMap" | "mysteryJournal";
type Sex = "Female" | "Male";

const canUseBrowserWindowScroll = () => typeof window !== "undefined" && typeof window.scrollTo === "function";
const scrollBrowserWindowToTop = () => {
  if (canUseBrowserWindowScroll()) window.scrollTo(0, 0);
};

type CharacterDraft = {
  firstName: string;
  familyName: string;
  sex: Sex;
  origin: string;
  hairStyle: string;
  hairColor: string;
  faceTrait?: string;
};

type StoryMessageSegment = {
  text: string;
  color?: string;
  npcId?: string;
};

type StoryMessage = {
  id: string;
  speaker: "GM" | "Ravenwood Mansion" | "Player" | "System";
  text: string;
  icon?: IconDumpKey;
  portraitNpcId?: string;
  roll?: string;
  rich?: StoryMessageSegment[];
  archiveDay?: number;
  archiveDaytime?: Daytime;
};

type MysteryArrivalPopup = {
  entries: {
    id: string;
    title: string;
    text: string;
    icon?: IconDumpKey;
    portraitNpcId?: string;
  }[];
};
type Daytime = "Morning" | "Breakfast" | "Midday" | "Lunch" | "Afternoon" | "Evening" | "Night" | "Midnight";

type MysteryCheckKind = "Athletics" | "History" | "Search" | "Medicine" | "Charisma" | "Persuasion" | "Deception" | "Sleight of Hand" | "Stealth" | "Composure" | "Rizz";

type MysteryDetectiveProfile = Pick<CharacterDraft, "firstName" | "familyName" | "sex" | "origin" | "hairStyle" | "hairColor"> & {
  id: string;
  portraitLineage: string;
  visualRace: MysteryVisualRace;
  faceTrait?: string;
};

type MysteryRoom = {
  id: string;
  name: string;
  floor: 1 | 2 | 3;
  kind: "public" | "guest" | "staff" | "service" | "hidden";
  accessible: boolean;
  occupantIds: string[];
  bedSetup?: string;
  capacity?: number;
};

type MysteryNpc = {
  id: string;
  firstName: string;
  familyName: string;
  sex: Sex;
  age: number;
  role: "Guest" | "Staff";
  familyStatus: string;
  education: string;
  occupation: string;
  reasonOfStay: string;
  currentStay: string;
  plannedStay: string;
  previousStay: string;
  secret: string;
  roomId: string;
  stationRoomId: string;
  trust: number;
  temporaryTrust: number;
  romance: number;
  romanceRevealed: boolean;
  substancePreference: "none" | "alcohol" | "cigarettes" | "weed" | "alcohol and cigarettes" | "alcohol and weed";
  substanceState: "sober" | "tipsy" | "drunk" | "high";
  substanceTurns: number;
  familyRelationNote?: string;
  ravenwoodPortraitKey?: string;
  portraitLineage?: string;
  visualRace?: MysteryVisualRace;
  alive: boolean;
  isChild: boolean;
};

type MysteryMurder = {
  victimId: string;
  killerId: string;
  day: number;
  daytime: Daytime;
  roomId: string;
  alternateRoomId?: string;
  method: string;
  motive: string;
  proof: string;
  proofs: string[];
  witnessId?: string;
  witnessSummary?: string;
  discovered: boolean;
  solved?: boolean;
  prevented?: boolean;
};

type MysteryFindableKind = "Proof" | "Snatchable";
type MysteryClueRole = "Motive" | "Method" | "Witness" | "FalseLead";

type MysteryFindable = {
  id: string;
  kind: MysteryFindableKind;
  name: string;
  description: string;
  playerName?: string;
  playerDescription?: string;
  origin?: "Crime" | "Drama" | "Abandoned" | "House" | "Neutral";
  roomId?: string;
  holderNpcId?: string;
  availableDay: number;
  availableDaytime: Daytime;
  relatedMurderIndex?: number;
  clueRole?: MysteryClueRole;
  falseLeadForMurderIndex?: number;
  proofText?: string;
  searchDifficulty?: MysteryRollOutcome["tier"];
  rollFailures?: Record<string, number>;
  lockedChecks?: string[];
  collected?: boolean;
};

type MysteryNpcRelationshipKind = "Family" | "Marriage" | "Friendship" | "Rivalry" | "Romance" | "Affair" | "Debt" | "Blackmail" | "Witness" | "Protection" | "Suspicion" | "Work";

type MysteryNpcRelationship = {
  id: string;
  fromId: string;
  toId: string;
  kind: MysteryNpcRelationshipKind;
  detail: string;
  hidden: boolean;
  trustImpact: number;
  motiveRisk: number;
  availableDay?: number;
  availableDaytime?: Daytime;
};

type MysteryFamilyGraph = {
  links: MysteryStoredFamilyRelation[];
};

type MysteryFamilyStructure = {
  parentChild: { parentId: string; childId: string }[];
  siblings: { aId: string; bId: string }[];
  spouses: { aId: string; bId: string }[];
  partners: { aId: string; bId: string }[];
  lovers: { aId: string; bId: string }[];
  cousins: { aId: string; bId: string }[];
  auntUncleNibling: { auntUncleId: string; niblingId: string }[];
};

type MysteryFamilyTreeEdgeKind = "parentChild" | "sibling" | "spouse" | "partner" | "lover" | "cousin" | "auntUncleNibling";

type MysteryCoreFamilyRelationLabel =
  | "mother"
  | "father"
  | "daughter"
  | "son"
  | "sister"
  | "brother"
  | "spouse"
  | "partner"
  | "lover"
  | "cousin"
  | "aunt"
  | "uncle"
  | "niece"
  | "nephew"
  | "grandmother"
  | "grandfather"
  | "granddaughter"
  | "grandson"
  | "step-daughter"
  | "step-son";

type MysteryWeakFamilyRelationLabel =
  | "partner's lover"
  | "spouse's lover"
  | "mother-in-law"
  | "father-in-law"
  | "brother-in-law"
  | "sister-in-law"
  | `lover's ${MysteryCoreFamilyRelationLabel}`;

type MysteryFamilyRelationLabel = MysteryCoreFamilyRelationLabel | MysteryWeakFamilyRelationLabel;

type MysteryStoredFamilyRelation = {
  subjectId: string;
  otherId: string;
  label: MysteryFamilyRelationLabel;
  source: "direct" | "derived" | "weak";
};

type MysteryAdultFamilyLink = "Sibling" | "Cousin" | "Adult child" | "Parent" | "Spouse";

type MysteryAdultFamilyPlan = {
  relatedIndex: number;
  link: MysteryAdultFamilyLink;
} | null;

type MysteryFamilyTreeEdge = {
  id: string;
  fromId: string;
  toId: string;
  kind: MysteryFamilyTreeEdgeKind;
};

type MysteryGame = {
  id: string;
  title: string;
  player: Pick<CharacterDraft, "firstName" | "familyName" | "sex" | "origin" | "hairStyle" | "hairColor" | "faceTrait"> & Pick<PortraitSubject, "ravenwoodPortraitKey" | "portraitLineage" | "visualRace"> & { id: string; age: number; detectiveId?: string };
  day: number;
  daytime: Daytime;
  rooms: MysteryRoom[];
  npcs: MysteryNpc[];
  npcRelationships: MysteryNpcRelationship[];
  familyGraph?: MysteryFamilyGraph;
  murders: MysteryMurder[];
  findables: MysteryFindable[];
  currentRoomId: string;
  playerRoomId: string;
  messages: StoryMessage[];
  storyFocusMessageId?: string;
  journal: StoryMessage[];
  journalNotes: string;
  sanityLedger: string[];
  aiMemory: string[];
  aiConversationSummaries: string[];
  npcConversationMemory?: Record<string, string[]>;
  conversationNpcId?: string;
  conversationRoomId?: string;
  discoveredProof: string[];
  inventory: string[];
  medalEvents?: MysteryMedalId[];
  rollAttemptLedger?: Record<string, number>;
  seriousCatchCount?: number;
  finished: boolean;
  won: boolean;
  summary?: string;
  lossPending?: boolean;
  murdererAttackPending?: boolean;
  pendingBodyDiscoveryPopup?: { title: string; text: string };
  pendingArrivalPopup?: MysteryArrivalPopup;
  closedDoorRoomId?: string;
  closedDoorReturnRoomId?: string;
  hiddenInRoomId?: string;
  hiddenFromNpcIds?: string[];
  witnessInvitationNpcIds?: string[];
  witnessKnowledgeDeliveredNpcIds?: string[];
};

type MysteryMedalId =
  | "killerCaught"
  | "perfectSolve"
  | "motiveReader"
  | "proofBearer"
  | "oneLifeSaved"
  | "twoLivesSaved"
  | "childSaved"
  | "childMurdererCaught"
  | "killerRomance"
  | "loveFound"
  | "loveLost"
  | "witnessSilenced"
  | "lastGlassStanding"
  | "coupleBreaker"
  | "bloodyJustice"
  | "tooRightToLive"
  | "evidenceArchivist"
  | "witnessWhisperer"
  | "lightFingers"
  | "midnightCloser";

type MysteryMedalDefinition = {
  id: MysteryMedalId;
  title: string;
  description: string;
  icon: ImageSourcePropType;
};

const mysteryMedalDefinitions: MysteryMedalDefinition[] = [
  { id: "killerCaught", title: "Killer Caught", description: "Finish a case by stopping the murderer.", icon: require("./assets/ravenwood/medals/optimized/killer_caught.png") },
  { id: "perfectSolve", title: "Perfect Solve", description: "Get the killer, motive, and proof right in one accusation.", icon: require("./assets/ravenwood/medals/optimized/perfect_solve.png") },
  { id: "motiveReader", title: "Motive Reader", description: "Win an accusation because you guessed the motive right.", icon: require("./assets/ravenwood/medals/optimized/motive_reader.png") },
  { id: "proofBearer", title: "Proof Bearer", description: "Win an accusation with the right physical proof.", icon: require("./assets/ravenwood/medals/optimized/proof_bearer.png") },
  { id: "oneLifeSaved", title: "Life Saver", description: "Prevent at least one future murder by catching the murderer fast enough.", icon: require("./assets/ravenwood/medals/optimized/one_life_saved.png") },
  { id: "twoLivesSaved", title: "Two Lives Saved", description: "Prevent at least two future murders in one game.", icon: require("./assets/ravenwood/medals/optimized/two_lives_saved.png") },
  { id: "childSaved", title: "Small Hand Held", description: "Prevent the murder of a child resident.", icon: require("./assets/ravenwood/medals/optimized/child_saved.png") },
  { id: "childMurdererCaught", title: "Child Murderer Caught", description: "Catch or stop a killer whose victim was a child.", icon: require("./assets/ravenwood/medals/optimized/child_murderer_caught.png") },
  { id: "killerRomance", title: "Dangerous Heart", description: "Build a romance with the murderer before the case ends.", icon: require("./assets/ravenwood/medals/optimized/killer_romance.png") },
  { id: "loveFound", title: "Love in the Mansion", description: "End a finished case with a living love interest.", icon: require("./assets/ravenwood/medals/optimized/love_found.png") },
  { id: "loveLost", title: "Love Lost in the Mansion", description: "Lose a love interest in Ravenwood.", icon: require("./assets/ravenwood/medals/optimized/love_lost.png") },
  { id: "witnessSilenced", title: "Silenced Witness", description: "Kill a witness to protect the murderer.", icon: require("./assets/ravenwood/medals/optimized/witness_silenced.png") },
  { id: "lastGlassStanding", title: "Last Glass Standing", description: "Outdrink the mansion guests and still finish the case.", icon: require("./assets/ravenwood/medals/optimized/last_glass_standing.png") },
  { id: "coupleBreaker", title: "Broken Hearts", description: "Break up a couple.", icon: require("./assets/ravenwood/medals/optimized/couple_breaker.png") },
  { id: "bloodyJustice", title: "Bloody Justice", description: "End a case by killing the culprit yourself.", icon: require("./assets/ravenwood/medals/optimized/bloody_justice.png") },
  { id: "tooRightToLive", title: "Too Right to Live", description: "Name the true killer without enough proof and pay for it.", icon: require("./assets/ravenwood/medals/optimized/too_right_to_live.png") },
  { id: "evidenceArchivist", title: "Evidence Archivist", description: "Collect every proof item during working a case.", icon: require("./assets/ravenwood/medals/optimized/evidence_archivist.png") },
  { id: "witnessWhisperer", title: "Witness Whisperer", description: "Earn enough trust for a witness to privately reveal what they know.", icon: require("./assets/ravenwood/medals/optimized/witness_whisperer.png") },
  { id: "lightFingers", title: "Light Fingers", description: "Successfully steal an item during a finished case.", icon: require("./assets/ravenwood/medals/optimized/light_fingers.png") },
  { id: "midnightCloser", title: "Midnight Closer", description: "Win a case at Night or Midnight.", icon: require("./assets/ravenwood/medals/optimized/midnight_closer.png") }
];

function addMysteryMedalEvents(existing: MysteryMedalId[] | undefined, events: MysteryMedalId[]): MysteryMedalId[] {
  return Array.from(new Set([...(existing ?? []), ...events]));
}

const themes = {
  dark: {
    bg: "#09090c",
    panel: "#181820",
    panel2: "#24242e",
    text: "#f6f1ee",
    dim: "#b8b2b8",
    accent: "#b5122b",
    line: "#4f4f59",
    silver: "#c4c7cc",
    gold: "#f0c45c",
    good: "#9fb29b",
    warning: "#d6a84b"
  },
  pastel: {
    bg: "#fbf6ee",
    panel: "#fffaf2",
    panel2: "#eef3e8",
    text: "#403844",
    dim: "#817784",
    accent: "#c7839d",
    line: "#d9d0dc",
    silver: "#a8aab3",
    gold: "#b9932f",
    good: "#9aad92",
    warning: "#b99354"
  }
};

const menuBackgrounds = {
  dark: require("./assets/backgrounds/optimized/main-menu-dark.jpg"),
  pastel: require("./assets/backgrounds/optimized/main-menu-pastel.jpg")
};

const appBackgrounds: Record<ThemeName, ImageSourcePropType[]> = {
  dark: [
    require("./assets/backgrounds/optimized/app-dark-ink.jpg"),
    require("./assets/backgrounds/optimized/app-dark-slate.jpg"),
    require("./assets/backgrounds/optimized/app-dark-burgundy.jpg"),
    require("./assets/backgrounds/optimized/app-dark-purple.jpg"),
    require("./assets/backgrounds/optimized/app-dark-red.jpg")
  ],
  pastel: [
    require("./assets/backgrounds/optimized/app-light-silver.jpg"),
    require("./assets/backgrounds/optimized/app-light-parchment.jpg"),
    require("./assets/backgrounds/optimized/app-light-green.jpg"),
    require("./assets/backgrounds/optimized/app-light-peach.jpg"),
    require("./assets/backgrounds/optimized/app-light-lavender.jpg")
  ]
};

function appBackgroundForScreen(themeName: ThemeName, screen: Screen): ImageSourcePropType {
  const backgrounds = appBackgrounds[themeName];
  const screenOrder: Screen[] = [
    "load",
    "past",
    "medals",
    "settings",
    "mysteryDetectiveSelect",
    "mysteryPortraitSelect",
    "mystery",
    "mysteryCharacter",
    "mysteryRelations",
    "mysteryFamilyTree",
    "mysteryMap",
    "mysteryJournal"
  ];
  const index = Math.max(0, screenOrder.indexOf(screen));
  return backgrounds[index % backgrounds.length];
}

type IconAsset = { source: ImageSourcePropType; width: number; height: number; scale?: number; offsetX?: number; offsetY?: number };
const iconAssets = {
  magnifier: { source: require("./assets/ravenwood/icons/optimized/magnifier.png"), width: 175, height: 179, scale: 0.96, offsetX: -1, offsetY: 1 },
  book: { source: require("./assets/ravenwood/icons/optimized/book.png"), width: 179, height: 175, scale: 0.96, offsetX: -1, offsetY: 2 },
  candle: { source: require("./assets/ravenwood/icons/optimized/candle.png"), width: 183, height: 194, scale: 0.98, offsetY: -1 },
  shadowPortrait: { source: require("./assets/ravenwood/icons/optimized/shadow_portrait.png"), width: 162, height: 188, scale: 0.96, offsetY: 1 },
  bag: { source: require("./assets/ravenwood/icons/optimized/bag.png"), width: 189, height: 180, scale: 0.96, offsetY: 1 },
  key: { source: require("./assets/ravenwood/icons/optimized/key.png"), width: 179, height: 176, scale: 0.96 },
  letter: { source: require("./assets/ravenwood/icons/optimized/letter.png"), width: 185, height: 174, scale: 0.96 },
  document: { source: require("./assets/ravenwood/icons/optimized/document.png"), width: 177, height: 189, scale: 0.96 },
  money: { source: require("./assets/ravenwood/icons/optimized/money.png"), width: 158, height: 177, scale: 0.96 },
  death: { source: require("./assets/ravenwood/icons/optimized/death.png"), width: 178, height: 170, scale: 0.96 },
  cards: { source: require("./assets/ravenwood/icons/optimized/cards.png"), width: 198, height: 218, scale: 0.96 },
  bettingSlip: { source: require("./assets/ravenwood/icons/optimized/betting_slip.png"), width: 320, height: 320, scale: 1.02 },
  bettingSlipWithMoney: { source: require("./assets/ravenwood/icons/optimized/betting_slip_with_money.png"), width: 320, height: 320, scale: 1.02 },
  bottleWithTag: { source: require("./assets/ravenwood/icons/optimized/bottle_with_tag.png"), width: 320, height: 320, scale: 1.02 },
  bra: { source: require("./assets/ravenwood/icons/optimized/bra.png"), width: 320, height: 320, scale: 1.02 },
  bribeNote: { source: require("./assets/ravenwood/icons/optimized/bribe_note.png"), width: 320, height: 320, scale: 1.02 },
  camera: { source: require("./assets/ravenwood/icons/optimized/camera.png"), width: 320, height: 320, scale: 1.02 },
  candlestick: { source: require("./assets/ravenwood/icons/optimized/candlestick.png"), width: 320, height: 320, scale: 1.02 },
  cassette: { source: require("./assets/ravenwood/icons/optimized/casette.png"), width: 320, height: 320, scale: 1.02 },
  childrenToy: { source: require("./assets/ravenwood/icons/optimized/children_toy.png"), width: 213, height: 320, scale: 1.03 },
  childToy: { source: require("./assets/ravenwood/icons/optimized/child_toy.png"), width: 320, height: 320, scale: 1.02 },
  cigarettes: { source: require("./assets/ravenwood/icons/optimized/cigarettes.png"), width: 320, height: 320, scale: 1.02 },
  comb: { source: require("./assets/ravenwood/icons/optimized/comb.png"), width: 320, height: 320, scale: 1.02 },
  compass: { source: require("./assets/ravenwood/icons/optimized/compass.png"), width: 320, height: 320, scale: 1.02 },
  compassGlow1: { source: require("./assets/ravenwood/icons/optimized/compass_glow_1.png"), width: 512, height: 512, scale: 1.02 },
  compassGlow2: { source: require("./assets/ravenwood/icons/optimized/compass_glow_2.png"), width: 512, height: 512, scale: 1.02 },
  compassGlow3: { source: require("./assets/ravenwood/icons/optimized/compass_glow_3.png"), width: 512, height: 512, scale: 1.02 },
  compassGlow4: { source: require("./assets/ravenwood/icons/optimized/compass_glow_4.png"), width: 512, height: 512, scale: 1.02 },
  compassGlow5: { source: require("./assets/ravenwood/icons/optimized/compass_glow_5.png"), width: 512, height: 512, scale: 1.02 },
  condom: { source: require("./assets/ravenwood/icons/optimized/condom.png"), width: 320, height: 320, scale: 1.02 },
  cigaretteCase: { source: require("./assets/ravenwood/icons/optimized/engraved_cigarette_case.png"), width: 320, height: 213, scale: 1.02 },
  cuffLink: { source: require("./assets/ravenwood/icons/optimized/cuff_link.png"), width: 320, height: 320, scale: 1.02 },
  cup: { source: require("./assets/ravenwood/icons/optimized/cup.png"), width: 320, height: 320, scale: 1.02 },
  diary: { source: require("./assets/ravenwood/icons/optimized/diary.png"), width: 320, height: 320, scale: 1.02 },
  diaryKey: { source: require("./assets/ravenwood/icons/optimized/diary_key.png"), width: 320, height: 320, scale: 1.02 },
  electricalWire: { source: require("./assets/ravenwood/icons/optimized/electrical_wire.png"), width: 320, height: 320, scale: 1.02 },
  fog1: { source: require("./assets/ravenwood/icons/optimized/fog_1.png"), width: 320, height: 320, scale: 1.02 },
  fog2: { source: require("./assets/ravenwood/icons/optimized/fog_2.png"), width: 320, height: 320, scale: 1.02 },
  fog3: { source: require("./assets/ravenwood/icons/optimized/fog_3.png"), width: 320, height: 320, scale: 1.02 },
  fog4: { source: require("./assets/ravenwood/icons/optimized/fog_4.png"), width: 320, height: 320, scale: 1.02 },
  fog5: { source: require("./assets/ravenwood/icons/optimized/fog_5.png"), width: 320, height: 320, scale: 1.02 },
  forgedId: { source: require("./assets/ravenwood/icons/optimized/forged_id.png"), width: 320, height: 320, scale: 1.02 },
  forgedWill: { source: require("./assets/ravenwood/icons/optimized/forged_will.png"), width: 320, height: 320, scale: 1.02 },
  funeralProgramme: { source: require("./assets/ravenwood/icons/optimized/funeral_programme.png"), width: 213, height: 320, scale: 1.03 },
  guestRoomKey: { source: require("./assets/ravenwood/icons/optimized/guest_room_key.png"), width: 320, height: 320, scale: 1.02 },
  gloves: { source: require("./assets/ravenwood/icons/optimized/feminine_gloves.png"), width: 320, height: 320, scale: 1.02 },
  hairLock: { source: require("./assets/ravenwood/icons/optimized/hair_lock.png"), width: 320, height: 320, scale: 1.02 },
  handgun: { source: require("./assets/ravenwood/icons/optimized/hanggun.png"), width: 320, height: 213, scale: 1.02 },
  herbBundle: { source: require("./assets/ravenwood/icons/optimized/herb_bundle.png"), width: 320, height: 320, scale: 1.02 },
  knife: { source: require("./assets/ravenwood/icons/optimized/letter_opener_or_knife.png"), width: 320, height: 320, scale: 1.02 },
  letterWithDocument: { source: require("./assets/ravenwood/icons/optimized/letter_with_document.png"), width: 320, height: 320, scale: 1.02 },
  lighter: { source: require("./assets/ravenwood/icons/optimized/lighter.png"), width: 320, height: 213, scale: 1.02 },
  lipstick: { source: require("./assets/ravenwood/icons/optimized/lipstick.png"), width: 213, height: 320, scale: 1.03 },
  locket: { source: require("./assets/ravenwood/icons/optimized/locket.png"), width: 320, height: 320, scale: 1.02 },
  lockpicks: { source: require("./assets/ravenwood/icons/optimized/lock_picking_tools.png"), width: 320, height: 320, scale: 1.02 },
  map: { source: require("./assets/ravenwood/icons/optimized/map.png"), width: 320, height: 213, scale: 1.02 },
  masterKey: { source: require("./assets/ravenwood/icons/optimized/master_key.png"), width: 320, height: 320, scale: 1.02 },
  matchBox: { source: require("./assets/ravenwood/icons/optimized/match_box.png"), width: 320, height: 320, scale: 1.02 },
  mintGum: { source: require("./assets/ravenwood/icons/optimized/mint_gum.png"), width: 320, height: 320, scale: 1.02 },
  moneyEnvelope: { source: require("./assets/ravenwood/icons/optimized/money_in_envelope.png"), width: 320, height: 213, scale: 1.02 },
  newspaper: { source: require("./assets/ravenwood/icons/optimized/newspaper.png"), width: 320, height: 320, scale: 1.02 },
  newspaperClipping: { source: require("./assets/ravenwood/icons/optimized/part_of_newspaper.png"), width: 320, height: 320, scale: 1.02 },
  notes: { source: require("./assets/ravenwood/icons/optimized/notes.png"), width: 320, height: 320, scale: 1.02 },
  pen: { source: require("./assets/ravenwood/icons/optimized/pen.png"), width: 320, height: 320, scale: 1.02 },
  pencil: { source: require("./assets/ravenwood/icons/optimized/pencil.png"), width: 320, height: 320, scale: 1.02 },
  perfume: { source: require("./assets/ravenwood/icons/optimized/perfume.png"), width: 320, height: 320, scale: 1.02 },
  plate: { source: require("./assets/ravenwood/icons/optimized/plate.png"), width: 320, height: 320, scale: 1.02 },
  pocketWatch: { source: require("./assets/ravenwood/icons/optimized/pocket_watch.png"), width: 320, height: 320, scale: 1.02 },
  poison: { source: require("./assets/ravenwood/icons/optimized/poison.png"), width: 310, height: 320, scale: 1.02 },
  policeBadge: { source: require("./assets/ravenwood/icons/optimized/police_badge.png"), width: 320, height: 320, scale: 1.02 },
  portrait: { source: require("./assets/ravenwood/icons/optimized/portrait.png"), width: 320, height: 320, scale: 1.02 },
  pregnancyTest: { source: require("./assets/ravenwood/icons/optimized/pregnancy_test.png"), width: 320, height: 320, scale: 1.02 },
  redLiquid: { source: require("./assets/ravenwood/icons/optimized/red_liquid.png"), width: 320, height: 320, scale: 1.02 },
  romanceNovel: { source: require("./assets/ravenwood/icons/optimized/romance_novel.png"), width: 320, height: 320, scale: 1.02 },
  roundGlasses: { source: require("./assets/ravenwood/icons/optimized/round_glasses.png"), width: 320, height: 320, scale: 1.02 },
  screwdriver: { source: require("./assets/ravenwood/icons/optimized/screwdriver.png"), width: 213, height: 320, scale: 1.03 },
  serviceKeys: { source: require("./assets/ravenwood/icons/optimized/service_keys.png"), width: 320, height: 320, scale: 1.02 },
  sewingKit: { source: require("./assets/ravenwood/icons/optimized/sewing_kit.png"), width: 320, height: 320, scale: 1.02 },
  shovel: { source: require("./assets/ravenwood/icons/optimized/shovel.png"), width: 320, height: 320, scale: 1.02 },
  sleepingPills: { source: require("./assets/ravenwood/icons/optimized/sleeping_pills.png"), width: 320, height: 320, scale: 1.02 },
  sock: { source: require("./assets/ravenwood/icons/optimized/sock.png"), width: 320, height: 320, scale: 1.02 },
  spoon: { source: require("./assets/ravenwood/icons/optimized/spoon.png"), width: 320, height: 320, scale: 1.02 },
  sweetWrapper: { source: require("./assets/ravenwood/icons/optimized/sweet_wrapper.png"), width: 320, height: 320, scale: 1.02 },
  syringe: { source: require("./assets/ravenwood/icons/optimized/syringe.png"), width: 320, height: 320, scale: 1.02 },
  telephone: { source: require("./assets/ravenwood/icons/optimized/telephone.png"), width: 320, height: 320, scale: 1.02 },
  thread: { source: require("./assets/ravenwood/icons/optimized/thread.png"), width: 320, height: 320, scale: 1.02 },
  ticket: { source: require("./assets/ravenwood/icons/optimized/ticket.png"), width: 320, height: 320, scale: 1.02 },
  tornFabric: { source: require("./assets/ravenwood/icons/optimized/torn_fabric.png"), width: 320, height: 320, scale: 1.02 },
  towel: { source: require("./assets/ravenwood/icons/optimized/towel_or_cloth.png"), width: 320, height: 320, scale: 1.02 },
  vial: { source: require("./assets/ravenwood/icons/optimized/vial.png"), width: 196, height: 185, scale: 0.96 },
  wallet: { source: require("./assets/ravenwood/icons/optimized/wallet.png"), width: 320, height: 320, scale: 1.02 },
  weddingInvitation: { source: require("./assets/ravenwood/icons/optimized/wedding_invitation.png"), width: 320, height: 320, scale: 1.02 },
  wineGlass: { source: require("./assets/ravenwood/icons/optimized/wine_glass.png"), width: 320, height: 320, scale: 1.02 },
  wrench: { source: require("./assets/ravenwood/icons/optimized/wrench.png"), width: 320, height: 320, scale: 1.02 }
} satisfies Record<string, IconAsset>;
type IconDumpKey = keyof typeof iconAssets;
const ravenwoodCompassIcon = require("./assets/ravenwood/icons/optimized/compass.png");
const ravenwoodFogLayers: ImageSourcePropType[] = [
  require("./assets/ravenwood/icons/optimized/fog_1.png"),
  require("./assets/ravenwood/icons/optimized/fog_2.png"),
  require("./assets/ravenwood/icons/optimized/fog_3.png"),
  require("./assets/ravenwood/icons/optimized/fog_4.png"),
  require("./assets/ravenwood/icons/optimized/fog_5.png")
];
const ravenwoodCompassGlowLayers: ImageSourcePropType[] = [
  require("./assets/ravenwood/icons/optimized/compass_glow_1.png"),
  require("./assets/ravenwood/icons/optimized/compass_glow_2.png"),
  require("./assets/ravenwood/icons/optimized/compass_glow_3.png"),
  require("./assets/ravenwood/icons/optimized/compass_glow_4.png"),
  require("./assets/ravenwood/icons/optimized/compass_glow_5.png")
];

type MysteryRollOutcome = {
  check: MysteryCheckKind;
  die: number;
  total: number;
  tier: "failed" | "easy" | "medium" | "hard";
};

type MysteryAiReply = {
  text: string;
  trustDelta?: number;
  romanceDelta?: number;
  revealRomance?: boolean;
  summary?: string;
  memoryWrites?: string[];
  usedAi?: boolean;
  mode?: "offline" | "remote" | "scripted";
};

function ravenwoodRoomBackgroundFor(_mystery: Pick<MysteryGame, "rooms" | "currentRoomId">, _themeName: ThemeName): ImageSourcePropType | undefined {
  return undefined;
}

const RAVENWOOD_MIN_NPC_AGE = 9;
const RAVENWOOD_MAX_NPC_AGE = 75;
const RAVENWOOD_MIN_STAFF_AGE = 18;
const ravenwoodPlayerSelectableAges = [12, 16, 24, 30, 50];

const ravenwoodPortraitByKey: Record<string, RavenwoodGuestPortraitAsset> = Object.fromEntries(
  [...ravenwoodGuestPortraitAssets, ...ravenwoodStaffPortraitAssets, ...ravenwoodPlayerPortraitAssets].map((asset) => [asset.key, asset])
);

type PortraitSubject = {
  id?: string;
  firstName: string;
  familyName: string;
  sex: Sex;
  age: number;
  origin?: string;
  hairStyle?: string;
  hairColor?: string;
  faceTrait?: string;
  bloodline?: string;
  ravenwoodPortraitKey?: string;
  portraitLineage?: string;
  visualRace?: MysteryVisualRace;
  alive?: boolean;
};

type MysteryDetectiveProfilePreset = Omit<MysteryDetectiveProfile, "sex" | "portraitLineage" | "visualRace">;

const ravenwoodDetectiveProfilePresets: Record<string, MysteryDetectiveProfilePreset> = {
  "player-custom01-row-01": {
    id: "lin-ward",
    firstName: "Lin",
    familyName: "Ward",
    origin: "Western Marches",
    hairStyle: "Wavy",
    hairColor: "Black"
  },
  "player-custom01-row-02": {
    id: "adrian-locke",
    firstName: "Adrian",
    familyName: "Locke",
    origin: "Northlands",
    hairStyle: "Short",
    hairColor: "Black"
  },
  "player-custom02-row-01": {
    id: "amara-voss",
    firstName: "Amara",
    familyName: "Voss",
    origin: "Deep Cities",
    hairStyle: "Long Straight",
    hairColor: "Blonde"
  },
  "player-custom02-row-02": {
    id: "hana-saito",
    firstName: "Hana",
    familyName: "Saito",
    origin: "Island Courts",
    hairStyle: "Messy Bun",
    hairColor: "Black"
  },
  "player-custom02-row-03": {
    id: "felix-ashford",
    firstName: "Felix",
    familyName: "Ashford",
    origin: "Western Marches",
    hairStyle: "Wavy",
    hairColor: "Blonde"
  },
  "player-custom03-row-01": {
    id: "beatrice-gray",
    firstName: "Beatrice",
    familyName: "Gray",
    origin: "Northlands",
    hairStyle: "Long Straight",
    hairColor: "Ginger"
  },
  "player-custom03-row-02": {
    id: "nikhil-rao",
    firstName: "Nikhil",
    familyName: "Rao",
    origin: "Southern Provinces",
    hairStyle: "Curly",
    hairColor: "Black"
  },
  "player-custom03-row-03": {
    id: "zadie-marlow",
    firstName: "Zadie",
    familyName: "Marlow",
    origin: "Harbor Quarter",
    hairStyle: "Braided",
    hairColor: "Dark Red"
  },
  "player-custom03-row-04": {
    id: "milo-keene",
    firstName: "Milo",
    familyName: "Keene",
    origin: "Deep Cities",
    hairStyle: "Messy Bun",
    hairColor: "Brown"
  },
  "player-custom04-row-01": {
    id: "arun-mehta",
    firstName: "Arun",
    familyName: "Mehta",
    origin: "Southern Provinces",
    hairStyle: "Short",
    hairColor: "Black",
    faceTrait: "Scarred"
  },
  "player-custom04-row-02": {
    id: "lydia-fenwick",
    firstName: "Lydia",
    familyName: "Fenwick",
    origin: "Western Marches",
    hairStyle: "Curly",
    hairColor: "Ginger"
  },
  "player-custom04-row-04": {
    id: "soren-park",
    firstName: "Soren",
    familyName: "Park",
    origin: "Eastern Coast",
    hairStyle: "Shaved",
    hairColor: "Black"
  },
  "player-player05-row-02": {
    id: "julian-north",
    firstName: "Julian",
    familyName: "North",
    origin: "Northlands",
    hairStyle: "Short",
    hairColor: "Brown"
  },
  "player-player05-row-03": {
    id: "mira-nair",
    firstName: "Mira",
    familyName: "Nair",
    origin: "Southern Provinces",
    hairStyle: "Long Straight",
    hairColor: "Black"
  },
  "player-player05-row-04": {
    id: "edwin-crow",
    firstName: "Edwin",
    familyName: "Crow",
    origin: "Western Marches",
    hairStyle: "Curly",
    hairColor: "Dark Red",
    faceTrait: "Sharp-Boned"
  }
};

const ravenwoodDetectiveDisplayOrder = [
  "amara-voss",
  "adrian-locke",
  "hana-saito",
  "nikhil-rao",
  "beatrice-gray",
  "felix-ashford",
  "lin-ward",
  "soren-park",
  "zadie-marlow",
  "milo-keene",
  "lydia-fenwick",
  "julian-north",
  "mira-nair",
  "edwin-crow"
];

function fallbackMysteryDetectiveProfile(asset: RavenwoodGuestPortraitAsset, index: number): MysteryDetectiveProfilePreset {
  const fallbackFirstNames = asset.sex === "Female"
    ? ["Elise", "Maribel", "Nadia", "Tamsin"]
    : ["Edwin", "Rowan", "Cassian", "Tristan"];
  const fallbackFamilyNames = ["Vale", "Locke", "Gray", "Marlow"];
  return {
    id: `detective-${asset.lineage}`,
    firstName: fallbackFirstNames[index % fallbackFirstNames.length],
    familyName: fallbackFamilyNames[index % fallbackFamilyNames.length],
    origin: "Western Marches",
    hairStyle: "Wavy",
    hairColor: asset.sex === "Female" ? "Brown" : "Black",
    faceTrait: "Sharp-Boned"
  };
}

const ravenwoodDetectiveProfiles: MysteryDetectiveProfile[] = ravenwoodPlayerPortraitAssets
  .filter((asset) => asset.age === 24)
  .sort((a, b) => a.lineage.localeCompare(b.lineage))
  .map((asset, index) => {
    const preset = ravenwoodDetectiveProfilePresets[asset.lineage] ?? fallbackMysteryDetectiveProfile(asset, index);
    return {
      ...preset,
      sex: asset.sex,
      portraitLineage: asset.lineage,
      visualRace: asset.visualRace
    };
  })
  .sort((a, b) => {
    const aIndex = ravenwoodDetectiveDisplayOrder.indexOf(a.id);
    const bIndex = ravenwoodDetectiveDisplayOrder.indexOf(b.id);
    return (aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex) - (bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex);
  });

const initialDraft: CharacterDraft = {
  firstName: "",
  familyName: "",
  sex: "Female",
  origin: "Ravenwood",
  hairStyle: "Wavy",
  hairColor: "Black",
  faceTrait: "Sharp-Boned"
};
function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = rand(0, index);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function rand(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roll(chance: number): boolean {
  return Math.random() < chance;
}

function fullName(person: { firstName: string; familyName: string }): string {
  return `${cleanRavenwoodNameText(person.firstName)} ${cleanRavenwoodNameText(person.familyName)}`;
}

function titleCase(value: string): string {
  return value
    .split(" ")
    .map((word) => word.split("-").map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : part)).join("-"))
    .join(" ");
}

function displayMysteryItemName(item: string): string {
  const cleaned = cleanRavenwoodNameText(item);
  const pocketMatch = cleaned.match(/^(.+?)\s+in\s+(.+?)'s pocket$/i);
  if (pocketMatch) return `${titleCase(pocketMatch[1])} from ${titleCase(pocketMatch[2])}'s Pocket`;
  return titleCase(cleaned)
    .replace(/\b(and|as|at|by|for|from|in|of|on|or|the|to|with)\b/gi, (word, _match, offset) =>
      offset === 0 ? word : word.toLowerCase()
    );
}

function stableHash(value: string): number {
  return value.split("").reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7);
}

function cleanRavenwoodNameText(value: string): string {
  return value
    .replace(/Nicol(?:Ăˇ|Ã¡)s/g, "Nicolas")
    .replace(/In(?:Ă©|Ã©)s/g, "Ines")
    .replace(/Z(?:Ă©|Ã©)lie/g, "Zelie")
    .replace(/Alarc(?:Ăł|Ã³|Ã)?n/g, "Alarcon")
    .replace(/Vald(?:Ă©|Ã©|Ã)?s/g, "Valdes");
}

function cleanMysteryNameEncoding(mystery: MysteryGame): MysteryGame {
  const cleanOptional = (value?: string) => value === undefined ? undefined : cleanRavenwoodNameText(value);
  const cleanMessage = (message: StoryMessage): StoryMessage => ({
    ...message,
    text: cleanRavenwoodNameText(message.text),
    roll: cleanOptional(message.roll),
    rich: message.rich?.map((segment) => ({ ...segment, text: cleanRavenwoodNameText(segment.text) }))
  });
  const playerFirstName = cleanRavenwoodNameText(mystery.player.firstName);
  const playerFamilyName = cleanRavenwoodNameText(mystery.player.familyName);
  const npcs = mystery.npcs.map((npc) => ({
    ...npc,
    firstName: cleanRavenwoodNameText(npc.firstName),
    familyName: cleanRavenwoodNameText(npc.familyName)
  }));
  const npcRelationships = (mystery.npcRelationships ?? []).map((relationship) => ({ ...relationship, detail: cleanRavenwoodNameText(relationship.detail) }));
  repairMysteryNpcProfileConsistency(npcs, npcRelationships, [mystery.player]);
  return {
    ...mystery,
    player: { ...mystery.player, firstName: playerFirstName, familyName: playerFamilyName },
    npcs,
    npcRelationships,
    murders: (mystery.murders ?? []).map((murder) => ({
      ...murder,
      method: cleanRavenwoodNameText(murder.method),
      motive: cleanRavenwoodNameText(murder.motive),
      proof: cleanRavenwoodNameText(murder.proof),
      proofs: (murder.proofs ?? []).map(cleanRavenwoodNameText),
      witnessSummary: cleanOptional(murder.witnessSummary)
    })),
    findables: (mystery.findables ?? []).map((findable) => mysteryWithPlayerFacingFindableText({
      ...findable,
      name: cleanRavenwoodNameText(findable.name),
      description: cleanRavenwoodNameText(findable.description),
      playerName: cleanOptional(findable.playerName),
      playerDescription: cleanOptional(findable.playerDescription),
      proofText: cleanOptional(findable.proofText)
    })),
    messages: (mystery.messages ?? []).map(cleanMessage),
    journal: (mystery.journal ?? []).map(cleanMessage),
    inventory: (mystery.inventory ?? []).map(cleanRavenwoodNameText),
    discoveredProof: (mystery.discoveredProof ?? []).map(cleanRavenwoodNameText),
    aiMemory: (mystery.aiMemory ?? []).map(cleanRavenwoodNameText),
    aiConversationSummaries: (mystery.aiConversationSummaries ?? []).map(cleanRavenwoodNameText),
    pendingArrivalPopup: mystery.pendingArrivalPopup ? {
      entries: mystery.pendingArrivalPopup.entries.map((entry) => ({
        ...entry,
        title: cleanRavenwoodNameText(entry.title),
        text: cleanRavenwoodNameText(entry.text)
      }))
    } : undefined,
    summary: cleanOptional(mystery.summary)
  };
}

function fallbackRavenwoodPlayerPortrait(subject: Pick<PortraitSubject, "firstName" | "familyName" | "sex" | "visualRace">): RavenwoodGuestPortraitAsset | null {
  const targetAge = ravenwoodPortraitAge(30);
  const matchingRace = ravenwoodPlayerPortraitAssets.filter((asset) => asset.sex === subject.sex && asset.age === targetAge && (!subject.visualRace || asset.visualRace === subject.visualRace));
  const matchingSex = ravenwoodPlayerPortraitAssets.filter((asset) => asset.sex === subject.sex && asset.age === targetAge);
  const pool = matchingRace.length > 0 ? matchingRace : matchingSex;
  if (pool.length === 0) return null;
  return pool[stableHash(`${subject.firstName}:${subject.familyName}:${subject.sex}`) % pool.length];
}

function ravenwoodPlayerPortraitFor(profile: MysteryDetectiveProfile, age: number): RavenwoodGuestPortraitAsset | null {
  const targetAge = ravenwoodPortraitAge(age);
  return ravenwoodPlayerPortraitAssets.find((asset) =>
    asset.lineage === profile.portraitLineage &&
    asset.sex === profile.sex &&
    asset.age === targetAge
  ) ?? null;
}

function mysteryPlayerAge(player: Pick<MysteryGame["player"], "age">): number {
  return player.age ?? 30;
}

function mysteryNpcUsesAge10Portrait(npc: MysteryNpc): boolean {
  const portraitAge = npc.ravenwoodPortraitKey ? ravenwoodPortraitByKey[npc.ravenwoodPortraitKey]?.age : undefined;
  return (portraitAge ?? ravenwoodPortraitAge(npc.age)) === 10;
}

function mysteryCanPlayerHaveRomanceWithNpc(player: Pick<MysteryGame["player"], "age">, npc: MysteryNpc): boolean {
  const playerAge = mysteryPlayerAge(player);
  const npcUsesAge10Portrait = mysteryNpcUsesAge10Portrait(npc);
  return playerAge === 12 ? npcUsesAge10Portrait : !npcUsesAge10Portrait;
}

function mysteryMedalIdsForFinishedGame(mystery: MysteryGame): MysteryMedalId[] {
  if (!mystery.finished) return [];
  const ids = new Set<MysteryMedalId>(mystery.medalEvents ?? []);
  const npcById = new Map(mystery.npcs.map((npc) => [npc.id, npc]));
  const killerIds = new Set(mystery.murders.map((murder) => murder.killerId));
  const preventedMurders = mystery.murders.filter((murder) => murder.prevented);
  const solvedMurders = mystery.murders.filter((murder) => murder.solved);
  const summary = (mystery.summary ?? "").toLowerCase();

  if (mystery.won) ids.add("killerCaught");
  if (preventedMurders.length >= 1) ids.add("oneLifeSaved");
  if (preventedMurders.length >= 2) ids.add("twoLivesSaved");
  if (preventedMurders.some((murder) => npcById.get(murder.victimId)?.isChild)) ids.add("childSaved");
  if (mystery.won && [...solvedMurders, ...preventedMurders].some((murder) => npcById.get(murder.victimId)?.isChild)) ids.add("childMurdererCaught");
  if (mystery.npcs.some((npc) => killerIds.has(npc.id) && npc.romance >= 20)) ids.add("killerRomance");
  if (mystery.npcs.some((npc) => npc.alive && npc.romance >= 65 && mysteryCanPlayerHaveRomanceWithNpc(mystery.player, npc))) ids.add("loveFound");
  if (mystery.npcs.some((npc) => !npc.alive && npc.romance >= 65 && mysteryCanPlayerHaveRomanceWithNpc(mystery.player, npc))) ids.add("loveLost");
  if (summary.includes("killed") && summary.includes("ended the murders")) ids.add("bloodyJustice");
  if (summary.includes("accused the true killer without enough proof")) ids.add("tooRightToLive");
  if ((mystery.witnessKnowledgeDeliveredNpcIds ?? []).length > 0) ids.add("witnessWhisperer");
  if (mystery.won && (mystery.daytime === "Night" || mystery.daytime === "Midnight")) ids.add("midnightCloser");

  const proofFindables = mystery.findables.filter((findable) => findable.kind === "Proof");
  if (proofFindables.length > 0) {
    const inventory = mystery.inventory.map((item) => item.toLowerCase());
    const discoveredProof = mystery.discoveredProof.map((item) => item.toLowerCase());
    const allProofsCollected = proofFindables.every((findable) => {
      const proofText = findable.proofText?.toLowerCase();
      const names = [findable.name, findable.playerName, findable.description, findable.playerDescription].filter(Boolean).map((item) => item!.toLowerCase());
      return Boolean(findable.collected) ||
        (proofText ? discoveredProof.includes(proofText) : false) ||
        names.some((name) => inventory.includes(name));
    });
    if (allProofsCollected) ids.add("evidenceArchivist");
  }

  return mysteryMedalDefinitions.filter((definition) => ids.has(definition.id)).map((definition) => definition.id);
}

function mysteryMedalWinCountForFinishedGame(mystery: MysteryGame, medalId: MysteryMedalId): number {
  return mysteryMedalIdsForFinishedGame(mystery).includes(medalId) ? 1 : 0;
}

function mysteryPlayerPortraitSubject(player: MysteryGame["player"]): PortraitSubject {
  const fallback = player.ravenwoodPortraitKey ? null : fallbackRavenwoodPlayerPortrait(player);
  return {
    ...player,
    age: mysteryPlayerAge(player),
    alive: true,
    ravenwoodPortraitKey: player.ravenwoodPortraitKey ?? fallback?.key,
    portraitLineage: player.portraitLineage ?? fallback?.lineage,
    visualRace: player.visualRace ?? fallback?.visualRace
  };
}

function mysteryDetectivePortraitSubject(profile: MysteryDetectiveProfile, age: number): PortraitSubject {
  const portrait = ravenwoodPlayerPortraitFor(profile, age);
  return {
    id: profile.id,
    firstName: profile.firstName,
    familyName: profile.familyName,
    sex: profile.sex,
    age,
    origin: profile.origin,
    hairStyle: profile.hairStyle,
    hairColor: profile.hairColor,
    faceTrait: profile.faceTrait,
    ravenwoodPortraitKey: portrait?.key,
    portraitLineage: portrait?.lineage ?? profile.portraitLineage,
    visualRace: portrait?.visualRace ?? profile.visualRace,
    alive: true
  };
}

const daytimes: Daytime[] = ["Morning", "Breakfast", "Midday", "Lunch", "Afternoon", "Evening", "Night", "Midnight"];
const ravenwoodMurderDaytimes: Daytime[] = ["Afternoon", "Evening", "Night", "Midnight"];
function mysteryTimeSortValue(day: number, daytime: Daytime): number {
  return day * daytimes.length + daytimes.indexOf(daytime);
}

function mysteryTimeFromSortValue(value: number): { day: number; daytime: Daytime } {
  const day = Math.floor(value / daytimes.length);
  return { day, daytime: daytimes[value % daytimes.length] ?? "Morning" };
}

function mysteryGeneratedMurderSchedule(count: number): { day: number; daytime: Daytime }[] {
  const firstAllowed = mysteryTimeSortValue(2, "Evening");
  const firstDeadline = mysteryTimeSortValue(4, "Night");
  const lastAllowed = mysteryTimeSortValue(10, "Midnight");
  const candidates: number[] = [];
  for (let day = 2; day <= 11; day += 1) {
    for (const daytime of ravenwoodMurderDaytimes) {
      const value = mysteryTimeSortValue(day, daytime);
      if (value >= firstAllowed && value <= lastAllowed) candidates.push(value);
    }
  }
  const firstPool = candidates.filter((value) => value <= firstDeadline);
  const selected: number[] = [];
  if (count > 0 && firstPool.length > 0) {
    selected.push(pick(firstPool));
  }
  const pool = candidates.filter((value) => !selected.includes(value) && value > (selected[0] ?? firstAllowed - 1));
  while (selected.length < count && pool.length > 0) {
    const value = pick(pool);
    selected.push(value);
    pool.splice(pool.indexOf(value), 1);
  }
  return selected.sort((a, b) => a - b).map(mysteryTimeFromSortValue);
}

function mysteryTimeHasArrived(currentDay: number, currentDaytime: Daytime, availableDay: number, availableDaytime: Daytime): boolean {
  return mysteryTimeSortValue(currentDay, currentDaytime) >= mysteryTimeSortValue(availableDay, availableDaytime);
}

function mysteryAvailabilityLabel(day: number, daytime: Daytime): string {
  return `Day ${day} ${daytime}`;
}

const ravenwoodHotelPremise = {
  identity: "Ravenwood is an isolated late-nineteenth-century country mansion converted into an exclusive private hotel in 1998.",
  mood: "beautiful, comfortable, and quietly unsettling; luxury hides decay, politeness hides resentment, and elegant rooms keep uncomfortable memories.",
  daytime: "Pale sunlight, faded wallpaper, polished wood, floral fabrics, dust, excellent meals, staff moving silently, and residents trying to look respectable.",
  night: "Cold corridors, firelight, long shadows, creaking floorboards, distant footsteps, and music from the ballroom or an old radio after bedtime.",
  isolation: "Storms, damaged phone lines, blocked roads, and old locked rooms can turn the hotel into a closed circle of suspects.",
  garden: "The garden terrace has a pool and an outdoor jacuzzi, both currently out of order."
};
const ravenwoodCommonRooms = ["grand-hall", "drawing-room", "dining-room", "library", "conservatory", "billiards-room", "smoking-room", "garden-terrace", "west-gallery"];
const ravenwoodSocialRooms = ["drawing-room", "dining-room", "library", "conservatory", "billiards-room", "smoking-room", "garden-terrace", "west-gallery"];
const ravenwoodMealTimes: Daytime[] = ["Breakfast", "Lunch"];
const ravenwoodDrinkTimes: Daytime[] = ["Lunch", "Evening", "Night"];
const ravenwoodPrivateBelongings = ["wallet", "room key", "cigarette case", "lighter", "folded letter", "matchbook", "medicine tin", "notebook", "fountain pen", "silver compact", "watch"];
const ravenwoodStaffBelongings = ["service key", "room ledger note", "laundry tag", "staff pencil", "matchbook", "cigarettes", "folded schedule", "pantry chit"];
const ravenwoodAiEndpoint = "http://localhost:8787/ravenwood-chat";
const mysteryMethods = [
  "Blunt-force trauma",
  "Stabbing with a knife or sharp tool",
  "Strangulation",
  "Suffocation with bedding",
  "Drowning in a bath",
  "Drowning in a pool or ornamental pond",
  "Poison added to a drink",
  "Poison added to food",
  "Deliberate medication overdose",
  "Lethal substance delivered by injection",
  "Known allergen deliberately introduced",
  "Carbon monoxide exposure",
  "Deliberate gas leak",
  "Electrocution through tampered equipment",
  "Pushed down a staircase",
  "Pushed from a balcony",
  "Pushed from a window",
  "Killed in a deliberately set fire",
  "Trapped in smoke from a controlled fire",
  "Electrical appliance placed into bathwater",
  "Fatal assault followed by concealment of the body",
  "Shot in the heart by a gun"
];
const mysteryLockdownReasons = ["a snow storm has buried the road", "a landslide has blocked the lower pass", "a heat wave has shut the rail line", "a rain storm has washed out the bridge", "a hurricane warning has closed the coast road", "nearby fighting has made travel impossible", "a police cordon has sealed the valley"];
const mysteryWitnessClues = [
  "Witness: {witness} heard {victim} threaten {killer} shortly before the murder, but will only speak after trust is gained.",
  "Witness: {witness} saw {killer} near the crime scene at an unusual hour and is frightened to say it openly.",
  "Witness: {witness} noticed {killer} changing clothes after the esitimated time of the murder, but will only speak after trust is gained.",
  "Witness: {witness} overheard {killer} and {victim} arguing about something, but will only speak after trust is gained.",
  "Witness: {witness} saw {killer} pass by a service route shortly after {victim} died that does not match their public alibi and is frightened to say it openly."
];
const mysteryMotiveTemplates = [
  "To prevent {victim} from exposing {killer}'s affair with {linked_character}.",
  "To stop {victim} revealing that {killer} was secretly dating {linked_character}.",
  "To keep {victim} from exposing {killer}'s hidden engagement with {linked_character}.",
  "To stop {victim} revealing that {killer} is an addict.",
  "To prevent {victim} from telling {partner} about {killer}'s second relationship with {linked_character}.",
  "To stop {victim} revealing that {killer} had stolen money from work.",
  "To prevent {victim} from exposing {killer}'s gambling debts.",
  "To keep {victim} from proving that {killer} had killed before.",
  "To stop {victim} from revealing a blackmail scheme.",
  "To gain the inheritance from {victim}'s will."
];
const mysteryMinorMotiveTemplates = [
  "To stop {victim} revealing that {killer} had been in a forbidden room.",
  "To keep {victim} from telling they stole a key.",
  "To silence {victim} after being seen hiding evidence of a previous murder.",
  "To stop {victim} revealing a dangerous family secret.",
  "To prevent {victim} from exposing a lie about where {killer} had been.",
  "To keep {victim} from telling everyone about a broken object linked to the previous murder.",
  "To prevent {victim} from blaming {killer}'s family for the trouble."
];
const mysteryFamilyStatuses = ["Divorced", "Married", "Widowed", "Single", "In a relationship", "Engaged", "Secretly dating", "Secretly engaged", "In an open relationship", "On a break from a relationship", "Unsure", "Open to explore"];
const mysteryEducations = ["No formal education", "Home-schooled", "Primary school certificate", "Secondary school certificate", "High school diploma", "Vocational training certificate", "Technical college diploma", "Associate degree", "BA — Bachelor of Arts", "BSc — Bachelor of Science", "BEd — Bachelor of Education", "BEng — Bachelor of Engineering", "BFA — Bachelor of Fine Arts", "LLB — Bachelor of Laws", "MA — Master of Arts", "MSc — Master of Science", "MEd — Master of Education", "MBA — Master of Business Administration", "MEng — Master of Engineering", "MFA — Master of Fine Arts", "LLM — Master of Laws", "MD — Doctor of Medicine", "DDS/DMD — Doctor of Dental Surgery/Medicine", "DVM — Doctor of Veterinary Medicine", "PharmD — Doctor of Pharmacy", "PsyD — Doctor of Psychology", "EdD — Doctor of Education", "PhD in Medicine", "PhD in Chemistry", "PhD in Mathematics", "PhD in Biology", "PhD in Physics", "PhD in Engineering", "PhD in Computer Science", "PhD in Psychology", "PhD in Sociology", "PhD in History", "PhD in Literature", "PhD in Economics", "PhD in Political Science", "PhD in Philosophy", "Postdoctoral research qualification", "University professor qualification", "Honorary doctorate", "Customer service training", "Office administration training", "First aid training", "Food hygiene training", "Security guard training", "Basic book-keeping training", "Legal secretary training", "Medical secretary training", "Receptionist training", "Executive assistant training", "Travel agent training", "Tour guide training", "Drama school training", "Police academy training", "Primary teacher training", "Trade apprenticeship", "Completed compulsory schooling", "Law degree", "Legal training"];
const mysterySecrets = [
  "Is deeply in debt.",
  "Has unpaid gambling debts.",
  "Has been borrowing money from {linked_character}.",
  "Is hiding a recent bankruptcy.",
  "Has been stealing small amounts of money from the hotel.",
  "Destroyed a letter in their room.",
  "Has been bribing {linked_character}.",
  "Is terrified that their private relationship will be discovered with {linked_character}.",
  "Is hiding a forged document.",
  "Has a criminal charge from years ago under another name."
];
const mysteryChildSecrets = [
  "Broke a valuable object in the manor and hid the pieces.",
  "Stole sweets from the kitchen and lied about it.",
  "Sneaked into a locked hallway and saw {linked_character} and {linked_character} arguing.",
  "Found a dropped key and has not told an adult.",
  "Read part of a private letter without understanding all of it.",
  "Is scared of {linked_character} but will not say why.",
  "Saw {linked_character} leaving a room late at night.",
  "Hid under a table during an argument and heard the name {linked_character}.",
  "Took a small trinket from {linked_character}'s room.",
  "Invented a false story to avoid being punished."
];
const mysteryTeenSecrets = [
  "Lied about where they were after dinner.",
  "Sneaked into a service corridor and saw {linked_character} sneak around.",
  "Has been reading a private letter belonging to {linked_character}.",
  "Took a small amount of money from the hotel and plans to put it back.",
  "Knows {linked_character} and {linked_character} argued in private but is afraid to say so.",
  "Is hiding a broken object from their guardian.",
  "Promised not to reveal a family argument between {linked_character} and {linked_character}.",
  "Found a suspicious item and hid it out of fear.",
  "Has been secretly listening at doors and heard {linked_character} argue with {linked_character}.",
  "Saw {linked_character} change clothes after a late-night incident."
];
const mysteryHarmlessSecrets = [
  "Is quietly writing sentimental letters and hiding them out of embarrassment.",
  "Has been pretending to understand chess to impress another guest.",
  "Secretly hates formal dinners and escapes them whenever possible.",
  "Has been keeping a diary full of harmless hotel gossip.",
  "Is saving money for a surprise gift.",
  "Has been sneaking extra cakes from the kitchen.",
  "Is nervous about a harmless love letter being discovered.",
  "Has been practicing a song in private and is embarrassed by it.",
  "Is hiding a bad review they wrote in anger and now regrets.",
  "Has been lying about enjoying country walks."
];
const mysteryInnocentSuspiciousSecrets = [
  "Was seen hurrying through a corridor for an innocent private errand.",
  "Changed clothes after spilling wine and feared it would look suspicious.",
  "Hid a broken glass because they did not want to be billed for it.",
  "Was awake late because they could not sleep.",
  "Borrowed a key briefly to fetch a misplaced personal item.",
  "Burned an old letter that had nothing to do with the murder.",
  "Avoided the dining room to escape an awkward conversation.",
  "Was carrying cash for travel, not blackmail.",
  "Kept checking the windows because the weather made them uneasy.",
  "Whispered with staff about a harmless favor."
];
const mysteryReasonsOfStay = ["Attending a family reunion", "Attending a wedding", "Attending an engagement party", "Attending a memorial service", "Taking a summer vacation", "On their honeymoon", "Celebrating an anniversary", "Taking a weekend break", "Taking a romantic getaway", "Meeting a business partner", "Attending a work conference", "Visiting a relative", "Visiting an old friend", "Meeting a secret romantic partner", "Recovering after an illness", "Following an anonymous invitation", "Searching for a missing person", "Tracing their family history", "Researching a local story", "Reviewing the hotel", "Meeting a lawyer about an inheritance"];
const mysteryPublicAttentionReasons = ["Escaping unwanted media attention"];
const mysteryGuestOccupations = ["Retired", "Student", "Stay-at-home parent", "Accountant", "Actor", "Antique dealer", "Architect", "Art dealer", "Auctioneer", "Author", "Bank manager", "Boutique owner", "Cellist", "Doctor", "Journalist", "Lawyer", "Poet", "Tour guide", "Young heir", "Junior clerk", "Shop assistant", "Tour assistant", "None"];
const mysteryStaffOccupations = ["Butler", "Cleaner", "Cook", "Gardener", "Head waiter", "Housekeeper", "Kitchen porter", "Laundry worker", "Night porter", "Nurse", "Security guard", "Waiter", "Chauffeur", "Estate cleaner", "Kitchen helper", "Laundry helper", "Poolboy"];
const mysteryGuestCareerProfiles: { minAge: number; occupation: string; educations: string[] }[] = [
  { minAge: 18, occupation: "Student", educations: ["High school diploma", "Secondary school certificate", "Home-schooled", "Drama school training"] },
  { minAge: 18, occupation: "Young heir", educations: ["Home-schooled", "High school diploma", "Secondary school certificate"] },
  { minAge: 18, occupation: "Junior clerk", educations: ["High school diploma", "Office administration training", "Basic book-keeping training"] },
  { minAge: 18, occupation: "Shop assistant", educations: ["High school diploma", "Customer service training", "Receptionist training"] },
  { minAge: 18, occupation: "Tour assistant", educations: ["Tour guide training", "Customer service training", "High school diploma"] },
  { minAge: 21, occupation: "Poet", educations: ["BA — Bachelor of Arts", "High school diploma", "Drama school training"] },
  { minAge: 21, occupation: "Actor", educations: ["Drama school training", "BFA — Bachelor of Fine Arts", "High school diploma"] },
  { minAge: 22, occupation: "Journalist", educations: ["BA — Bachelor of Arts", "Office administration training", "High school diploma"] },
  { minAge: 22, occupation: "Tour guide", educations: ["Tour guide training", "Customer service training", "High school diploma"] },
  { minAge: 23, occupation: "Accountant", educations: ["Basic book-keeping training", "Office administration training", "Associate degree", "BSc — Bachelor of Science"] },
  { minAge: 24, occupation: "Author", educations: ["BA — Bachelor of Arts", "MA — Master of Arts", "High school diploma", "Home-schooled"] },
  { minAge: 24, occupation: "Cellist", educations: ["Drama school training", "BFA — Bachelor of Fine Arts", "Home-schooled"] },
  { minAge: 24, occupation: "Lawyer", educations: ["Law degree", "LLB — Bachelor of Laws", "Legal training"] },
  { minAge: 25, occupation: "Boutique owner", educations: ["Customer service training", "Basic book-keeping training", "Office administration training"] },
  { minAge: 27, occupation: "Architect", educations: ["BEng — Bachelor of Engineering", "MEng — Master of Engineering", "Technical college diploma"] },
  { minAge: 28, occupation: "Doctor", educations: ["MD — Doctor of Medicine", "PhD in Medicine", "First aid training"] },
  { minAge: 28, occupation: "Antique dealer", educations: ["Basic book-keeping training", "Customer service training", "BA — Bachelor of Arts"] },
  { minAge: 28, occupation: "Art dealer", educations: ["Customer service training", "Basic book-keeping training", "BA — Bachelor of Arts"] },
  { minAge: 30, occupation: "Auctioneer", educations: ["Customer service training", "Basic book-keeping training", "BA — Bachelor of Arts"] },
  { minAge: 32, occupation: "Stay-at-home parent", educations: ["High school diploma", "Secondary school certificate", "Home-schooled"] },
  { minAge: 35, occupation: "Bank manager", educations: ["Basic book-keeping training", "Office administration training", "MBA — Master of Business Administration"] },
  { minAge: 55, occupation: "Retired", educations: ["High school diploma", "Trade apprenticeship", "Office administration training"] }
];
const staffStations = ["kitchen", "staff-corridor", "servants-hall", "laundry", "pantry", "garden-terrace", "back-stairs"];
const ravenwoodMaleNames = ["Theodore", "Asher", "Cedric", "Soraaro", "Adrian", "Alaric", "Ambrose", "Arthur", "Bastian", "Benedict", "Blaise", "Caspian", "Dorian", "Edgar", "Edmund", "Elias", "Felix", "Florian", "Gabriel", "Gideon", "Hugo", "Jasper", "Julian", "Laurent", "Leander", "Leon", "Lucian", "Magnus", "Marcel", "Marius", "Oliver", "Percival", "Raphael", "Remy", "Rowan", "Sebastian", "Silas", "Soren", "Tristan", "Victor", "Vincent", "Xavier", "Elio", "Mael", "Noel", "Rafael", "Thierry", "Alejandro", "Alonso", "Cruz", "Diego", "Esteban", "Javier", "Leandro", "Lorenzo", "Mateo", "Santiago", "Dimitri", "Ilya", "Nikolai", "Stefan", "Akira", "Daichi", "Haru", "Hiro", "Itsuki", "Kaoru", "Kenji", "Ren", "Riku", "Sora", "Taejin", "Jun", "Minho", "Seojun", "Yichen", "Jian", "Lian", "Ming", "Renji", "Toma", "Alden", "Arden", "August", "Claude", "Corvin", "Elian", "Emil", "Evander", "Hadrian", "Hector", "Isidore", "Matthias", "Nicolas", "Octavian", "Orion", "Roman", "Sylvain", "Valentin", "Aurel", "Cassiel", "Lucien", "Nicolas", "Aleksi", "Emilian", "Kasimir", "Lev", "Mikhail", "Emiliaric", "Laurenvin", "Sorenan", "Jasperric", "Hiroien", "Soraair", "Ilyaas", "Alaricien", "Rafaelien", "Yichenvren", "Kenjiar", "Junen", "Valesian", "Asheran", "Emilia", "Javierian", "Matthiasas", "Alaricrel", "Felixric", "Thierren", "Itsukiric", "Oliveris", "Silasis", "Mariusor", "Aurelar", "Rikuric", "Mikhaiiel", "Gabrievar", "Sylvairiel", "Isideo", "Sebastiaian", "Marcelvon", "Abel", "Abraham", "Achilles", "Adam", "Adelard", "Adrianus", "Aeneas", "Aidan", "Alban", "Albert", "Albin", "Albrecht", "Alessio", "Alfonso", "Alfred", "Alistair", "Alonzo", "Amadeo", "Ansel", "Anselm", "Anton", "Antonio", "Archer", "Armand", "Armin", "Arnold", "Arsen", "Arturo", "Auberon", "Augustin", "Aurelio", "Baptiste", "Barnaby", "Barrett", "Bartholomew", "Beau", "Bellamy", "Berenger", "Bernard", "Bertrand", "Blaine", "Boris", "Bowen", "Bram", "Brendan", "Briar", "Broderick", "Byron", "Caelan", "Caesar", "Caius", "Callum", "Calvin", "Cassian", "Cato", "Cillian", "Cyril", "Damian", "Dante", "Darius", "Dashiell", "Declan", "Desmond", "Dominic", "Donovan", "Drake", "Eamon", "Easton", "Edric", "Edwin", "Elric", "Emmanuel", "Enzo", "Eric", "Ernest", "Eryk", "Ethan", "Eugene", "Fabian", "Fabio", "Ferdinand", "Finn", "Finnian", "Francis", "Frederick", "Gareth", "Gaston", "Gael", "Geoffrey", "George", "Gerard", "Godric", "Grayson", "Gregor", "Griffin", "Hamish", "Harold", "Harlan", "Harvey", "Henrik", "Ignatius", "Isaac", "Ivan", "Jace", "James", "Jerome", "Joel", "Jonah", "Jonathan", "Jordan", "Kai", "Kieran", "Killian", "Kristian", "Lachlan", "Lars", "Lawrence", "Lazar", "Lennox", "Liam", "Linus", "Lionel", "Lorcan", "Louis", "Luca", "Lukas", "Luther", "Malachi", "Malcolm", "Manuel", "Marco", "Marcus", "Maxim", "Maximilian", "Micah", "Milan", "Miles", "Milo", "Morgan", "Nathaniel", "Neil", "Nero", "Neville", "Oscar", "Osric", "Owen", "Pascal", "Patrick", "Philip", "Pierce", "Quentin", "Quill", "Raoul", "Raymond", "Reece", "Reid", "Rhys", "Roderick", "Roland", "Ronan", "Rory", "Ruben", "Rufus", "Rupert", "Samson", "Samuel", "Saul", "Scott", "Shae", "Sheridan", "Simon", "Stellan", "Sullivan", "Tobias", "Ulric", "Ulysses", "Vaughn", "Viggo", "Walter", "Warren", "Wilfred", "William", "Wolfgang", "Wyatt", "Yannick", "Yorick", "Zachary", "Zane", "Zephyr", "Aldric", "Cassien", "Darien", "Elarion", "Lucarien", "Valeric", "Soravian", "Raphaelor", "Mikhailen", "Dorianis", "Cassianor", "Alarien", "Renjior", "Sylveric", "Leandros", "Evandriel", "Hadrien", "Lucanor", "Aurelios", "Theodren", "Kaelian", "Renvar", "Tavian", "Asterion", "Corvian", "Elianor", "Magnor", "Valerian", "Julorien", "Bastior", "Emilien"];
const ravenwoodFemaleNames = ["Adeline", "Aurelia", "Beatrice", "Belladonna", "Camille", "Cassandra", "Celeste", "Celine", "Clara", "Cordelia", "Dahlia", "Delphine", "Eleanor", "Elise", "Elodie", "Emmeline", "Estelle", "Evangeline", "Flora", "Genevieve", "Giselle", "Helena", "Isadora", "Ivy", "Josephine", "Juliette", "Lenore", "Lilian", "Lorelei", "Lucille", "Madeleine", "Margot", "Marielle", "Mireille", "Nadine", "Noelle", "Odette", "Ophelia", "Rosalie", "Sabine", "Selene", "Seraphine", "Sylvie", "Theodora", "Valentina", "Vesper", "Victoria", "Vivienne", "Willow", "Amara", "Aveline", "Cressida", "Elara", "Fleur", "Isabeau", "Lavinia", "Melisande", "Ondine", "Alba", "Amalia", "Catalina", "Elena", "Esmeralda", "InĂ©s", "Isabella", "Lucia", "Marisol", "Paloma", "Anastasia", "Danica", "Irina", "Katya", "Milena", "Nadia", "Oksana", "Svetlana", "Tatiana", "Zoya", "Aiko", "Akari", "Emi", "Hana", "Haruka", "Kaede", "Mei", "Miyu", "Reina", "Yuna", "Chaewon", "Haeun", "Jisoo", "Nari", "Sora", "Xia", "Yue", "Lian", "Meilin", "Rin", "InĂ©syne", "Jisooa", "Sabineina", "Josephinora", "Reinaalia", "Isada", "Willowyne", "Irinaia", "Valentinis", "Isadorira", "Katyais", "Seraphi", "Aikois", "Marieuna", "Seleneuna", "Palomarea", "Elenaenne", "Helenaa", "InĂ©selle", "Naria", "Chaewira", "Xiaea", "Sabineora", "Evangelineora", "Meiis", "Rinea", "Hanaette", "Kaedeenne", "Harukaina", "Danicaia", "Emiora", "Giselleline", "Briaris", "Akariyne", "Emieria", "Irinavenne", "Loreleiia", "Reinaina", "Aikoira", "Abigail", "Adelaide", "Adelina", "Adriana", "Agatha", "Agnes", "Alessandra", "Alessia", "Alexandra", "Alice", "Alicia", "Alina", "Althea", "Amanda", "Amber", "Amelia", "Amelie", "Anastasie", "Angelique", "Annabelle", "Annalise", "Annika", "Antonia", "Arabella", "Ariadne", "Ariella", "Astrid", "Athena", "Audrey", "Autumn", "Avelina", "Azalea", "Bianca", "Blair", "Blythe", "Briony", "Calista", "Calliope", "Camellia", "Carina", "Caroline", "Catriona", "Cecelia", "Cecilia", "Cerise", "Charlotte", "Chiara", "Chloe", "Clarissa", "Clementine", "Colette", "Cosette", "Cynthia", "Daphne", "Delia", "Diana", "Dominique", "Edith", "Eileen", "Eleanora", "Eliana", "Elina", "Elisa", "Eliska", "Elliana", "Eloisa", "Elowen", "Elsa", "Emilia", "Emilie", "Enya", "Erika", "Esme", "Eulalia", "Eulalie", "Euphemia", "Evelyn", "Faith", "Felicia", "Felicity", "Fern", "Fiorella", "Florence", "Francesca", "Freya", "Gabriella", "Gemma", "Georgiana", "Gwendolyn", "Gwyneth", "Hazel", "Heidi", "Honora", "Imogen", "Iona", "Iris", "Isabelle", "Isolde", "Jacinta", "Jade", "Jessamine", "Joanna", "Jocelyn", "June", "Karina", "Katarina", "Laurel", "Leona", "Leontine", "Letitia", "Liora", "Lisette", "Loretta", "Louisa", "Louise", "Lucinda", "Lydia", "Lyra", "Mabel", "Maeve", "Magnolia", "Marceline", "Marina", "Matilda", "Meredith", "Minerva", "Mirabel", "Miranda", "Monica", "Morgana", "Nerissa", "Nina", "Oriana", "Ottilie", "Pandora", "Penelope", "Petra", "Philippa", "Phoebe", "Primrose", "Regina", "Renata", "Rosalind", "Rosemary", "Roxanne", "Ruby", "Sabrina", "Samantha", "Scarlett", "Serena", "Simone", "Sofia", "Sophie", "Stella", "Susanna", "Tabitha", "Thalia", "Theresa", "Tiffany", "Ursula", "Vanessa", "Vera", "Veronica", "Violet", "Virginia", "Willa", "Winifred", "Winter", "Yvette", "Zara", "Zinnia", "Altheia", "Araminta", "Belinda", "Bernadette", "Capucine", "Carlotta", "Celestine", "Clarimond", "Corinne", "Desiree", "Dominiquea", "Dorothea", "Eleanore", "Elisabetta", "Ernestine", "Euphrasie", "Florentine", "Geraldine", "Henrietta", "Hestia", "Isaline", "Jessamyn", "Leonie", "Lilou", "Liselotte", "Maelle", "Magdalene", "Maribelle", "Marigold", "Melina", "Mirabelle", "Noemi", "Ottavia", "Prisca", "Romilly", "Solene", "Tatienne", "Valencia", "Verena", "Yolande", "ZĂ©lie"];
const ravenwoodSurnames = ["Ash", "Black", "Briar", "Crow", "Dusk", "Elder", "Ember", "Ever", "Fair", "Fallow", "Fern", "Frost", "Glen", "Grey", "Hallow", "Hawke", "Hazel", "Hollow", "Iron", "Ivory", "Lark", "Marlowe", "Mist", "Moon", "Night", "Oak", "Raven", "Rose", "Rowan", "Sable", "Shadow", "Silver", "Snow", "Star", "Stone", "Storm", "Thorn", "Vale", "Vane", "Winter", "Wren", "Wilde", "Wood", "Bell", "Blake", "Byron", "Carrow", "Dacre", "Darcy", "Devereux", "Fairfax", "Graves", "Hale", "Harrow", "Hart", "Huxley", "Locke", "March", "Morrow", "Poe", "Quill", "Reeve", "Sinclair", "Sterling", "Thorne", "Voss", "Whitlock", "Wycliffe", "Arden", "Beaumont", "Bellefleur", "Clairmont", "Delacroix", "Desmarais", "Duval", "Fontaine", "Laurent", "Lenoir", "Moreau", "Rochefort", "Valmont", "Villiers", "AlarcĂłn", "Delgado", "Montoya", "Navarro", "Salazar", "Serrano", "ValdĂ©s", "Vega", "Volkov", "Morozov", "Orlov", "Petrov", "Romanov", "Sokolov", "Vasiliev", "Dragomir", "Takeda", "Kuroda", "Mori", "Akiyama", "Hayashi", "Ishikawa", "Han", "Seo", "Kang", "Jin", "Lin", "Shen", "Wei", "Zhao", "Crowbyron", "La Zhaofield", "Von Crowhurst", "La Salazarvane", "La Duvalclair", "Della Mistmere", "La Thornewick", "St. Lockebridge", "Del Fernember", "Du Thornridge", "Bellbridge", "St. Zhaowood", "Von Irondell", "St. Fallowclair", "Delgadoquill", "Villiersstone", "Du Wycliffehart", "Le Wood", "Von Seostorm", "Hayashihayashi", "Du Seomont", "Blakefield", "Le Fontainemoor", "De Fernwell", "Larkmist", "Le Halerose", "De Jinsokolov", "Le Snowfield", "Shadowwinter", "Van Fairfaxthorne", "La Stonestar", "Della Morozovstone", "Von Vasilievwood", "Ravenwinter", "Van Elderhurst", "Vasilievshade", "Du Ravenshade", "Du Darcy", "Evercliff", "Von Duvalmont", "Le Jinhurst", "Del Starsterling", "De Hallow", "De Thornerose", "La Ravenarden", "De Ardenbrook", "Della Fallowwood", "La Fallowclair", "La Fontainecourt", "La Beaumontbridge", "Silverwinter", "Glenhart", "St. Hazelzhao", "De Huxleyrose", "St. Clairmontromanov", "Devereuxhurst", "Roseshade", "Del Vasilievgrave", "Van Romanovwick", "Du Fairthorne","Ashcroft", "Ashbourne", "Ashfield", "Ashmere", "Ashford", "Ashwell", "Blackthorn", "Blackwood", "Blackwell", "Blackridge", "Blackmoor", "Blackstone", "Briarwood", "Briarfield", "Briarwell", "Crowhurst", "Crowley", "Crowmere", "Crowfield", "Crowstone", "Duskridge", "Duskmere", "Duskwood", "Elderwood", "Eldermere", "Elderbrook", "Elderfield", "Emberstone", "Emberwood", "Emberfield", "Everbrook", "Everfield", "Evermere", "Fairbrook", "Fairmont", "Fairfield", "Fallowmere", "Fallowbrook", "Fernbrook", "Fernfield", "Fernwick", "Frostmere", "Frostfield", "Frostwick", "Glenbrook", "Glenmere", "Greybrook", "Greyfield", "Greywick", "Greyhaven", "Greymoor", "Hallowmere", "Hallowbrook", "Hawkridge", "Hawkstone", "Hazelbrook", "Hazelfield", "Hazelwick", "Hollowbrook", "Hollowmere", "Ironbrook", "Ironfield", "Ivorybrook", "Ivoryfield", "Larkfield", "Larkwood", "Mistbrook", "Mistfield", "Mistmere", "Moonbrook", "Moonridge", "Nightbrook", "Nightfield", "Oakridge", "Oakmere", "Oakfield", "Ravenhurst", "Ravenwood", "Ravenmere", "Rosebrook", "Rosefield", "Rowanbrook", "Sablewood", "Sablemere", "Shadowbrook", "Shadowmere", "Silverbrook", "Silvermere", "Snowbrook", "Snowmere", "Starbrook", "Starfield", "Stonebrook", "Stonefield", "Stormbrook", "Stormfield", "Thornbrook", "Thornfield", "Thornmere", "Valebrook", "Valefield", "Winterbrook", "Wintermere", "Wrenfield", "Wildemere", "Woodcroft", "Woodmere"];

function fillMysteryTemplate(template: string, killer: MysteryNpc, victim: MysteryNpc, npcs: MysteryNpc[], witness?: MysteryNpc): string {
  const linkedPool = npcs.filter((npc) => npc.id !== killer.id && npc.id !== victim.id);
  const partnerPool = npcs.filter((npc) => npc.id !== killer.id);
  const suspectPool = npcs.filter((npc) => npc.id !== victim.id);
  const linked = pick(linkedPool.length > 0 ? linkedPool : [killer]);
  const partner = pick(partnerPool.length > 0 ? partnerPool : [victim]);
  const suspect = pick(suspectPool.length > 0 ? suspectPool : [killer]);
  const witnessNpc = witness ?? linked;
  return template
    .replaceAll("{killer}", fullName(killer))
    .replaceAll("{victim}", fullName(victim))
    .replaceAll("{linked_character}", fullName(linked))
    .replaceAll("{partner}", fullName(partner))
    .replaceAll("{suspect}", fullName(suspect))
    .replaceAll("{witness}", fullName(witnessNpc));
}

function mysteryMethodKind(method: string): string {
  const lower = method.toLowerCase();
  if (lower.includes("drink")) return "drink";
  if (lower.includes("food")) return "food";
  if (lower.includes("allergen")) return "allergen";
  if (lower.includes("overdose") || lower.includes("medication") || lower.includes("injection") || lower.includes("drugged")) return "drug";
  if (lower.includes("strangulation") || lower.includes("ligature")) return "strangulation";
  if (lower.includes("suffocation") || lower.includes("smothered")) return "smother";
  if (lower.includes("stabbing") || lower.includes("knife") || lower.includes("sharp")) return "blade";
  if (lower.includes("fire") || lower.includes("smoke")) return "fire";
  if (lower.includes("carbon monoxide") || lower.includes("gas")) return "gas";
  if (lower.includes("drowning") || lower.includes("bath") || lower.includes("pond")) return "water";
  if (lower.includes("electrocution") || lower.includes("electrical")) return "electric";
  if (lower.includes("staircase") || lower.includes("balcony") || lower.includes("window") || lower.includes("fall")) return "fall";
  if (lower.includes("vehicle") || lower.includes("brakes")) return "vehicle";
  if (lower.includes("concealment")) return "concealment";
  return "blunt";
}

function mysteryRoomsForMethod(method: string, rooms: MysteryRoom[], playerRoomId: string): MysteryRoom[] {
  const lower = method.toLowerCase();
  const candidates = rooms.filter((room) => room.id !== playerRoomId && (room.kind !== "guest" || room.accessible));
  const byIds = (ids: string[]) => candidates.filter((room) => ids.includes(room.id));
  if (lower.includes("bathwater") || lower.includes("bath")) return candidates.filter((room) => room.kind === "guest");
  if (lower.includes("pool") || lower.includes("pond")) return byIds(["garden-terrace"]);
  if (lower.includes("food") || lower.includes("allergen")) return byIds(["dining-room", "kitchen", "pantry"]);
  if (lower.includes("drink") || lower.includes("poison")) return byIds(["dining-room", "smoking-room", "billiards-room", "drawing-room", "pantry"]);
  if (lower.includes("medication") || lower.includes("injection")) return byIds(["guest-room-1", "guest-room-2", "guest-room-3", "guest-room-4", "guest-room-5", "guest-room-6", "guest-room-7", "guest-room-8", "guest-room-9", "guest-room-10", "servants-hall"]);
  if (lower.includes("staircase")) return byIds(["back-stairs", "grand-hall"]);
  if (lower.includes("balcony") || lower.includes("window")) return byIds(["west-gallery", "garden-terrace", "guest-room-1", "guest-room-2", "guest-room-3", "guest-room-4", "guest-room-5", "guest-room-6", "guest-room-7", "guest-room-8", "guest-room-9", "guest-room-10"]);
  if (lower.includes("carbon monoxide") || lower.includes("gas")) return byIds(["staff-corridor", "back-stairs", "servants-hall", "laundry", "kitchen"]);
  if (lower.includes("electrocution") || lower.includes("electrical")) return byIds(["bathroom", "laundry", "staff-corridor", "guest-room-1", "guest-room-2", "guest-room-3", "guest-room-4", "guest-room-5", "guest-room-6", "guest-room-7", "guest-room-8", "guest-room-9", "guest-room-10"]);
  if (lower.includes("fire") || lower.includes("smoke")) return byIds(["library", "smoking-room", "west-gallery", "staff-corridor", "back-stairs"]);
  return candidates;
}

function mysteryRoomsForVictimMurder(method: string, rooms: MysteryRoom[], playerRoomId: string, victim: MysteryNpc): MysteryRoom[] {
  const methodRooms = mysteryRoomsForMethod(method, rooms, playerRoomId);
  if (victim.role !== "Guest" || victim.roomId === playerRoomId) return methodRooms;

  const victimRoom = rooms.find((room) => room.id === victim.roomId);
  if (!victimRoom) return methodRooms;

  const kind = mysteryMethodKind(method);
  const bedroomSuitable = ["drug", "strangulation", "smother", "blade", "blunt", "water", "electric", "fall"].includes(kind);
  const privateDrinkOrPoison = kind === "drink" && /poison|drink|glass|wine|whiskey|champagne/i.test(method);
  if (!bedroomSuitable && !privateDrinkOrPoison) return methodRooms;

  const withoutDuplicate = methodRooms.filter((room) => room.id !== victimRoom.id);
  const bedroomWeight = kind === "smother" || kind === "drug" || kind === "water" ? 4 : 2;
  return [...withoutDuplicate, ...Array.from({ length: bedroomWeight }, () => victimRoom)];
}

function mysteryRollTargetNumber(tier: MysteryRollOutcome["tier"] | undefined): number {
  if (tier === "hard") return 10;
  if (tier === "medium") return 6;
  return 3;
}

function mysteryIncreaseDifficulty(tier: MysteryRollOutcome["tier"] | undefined): MysteryRollOutcome["tier"] {
  if (tier === "hard") return "hard";
  if (tier === "medium") return "hard";
  return "medium";
}

function mysteryFallbackRoomForMurder(method: string, rooms: MysteryRoom[], mainRoomId: string, playerRoomId: string): MysteryRoom | undefined {
  const methodRooms = mysteryRoomsForMethod(method, rooms, playerRoomId).filter((room) => room.id !== mainRoomId);
  const publicMethodRooms = methodRooms.filter((room) => room.kind === "public");
  if (publicMethodRooms.length > 0) return publicMethodRooms[stableHash(`${method}-${mainRoomId}-fallback`) % publicMethodRooms.length];
  const publicRooms = rooms.filter((room) => room.id !== mainRoomId && room.id !== playerRoomId && room.kind === "public");
  if (publicRooms.length > 0) return publicRooms[stableHash(`${method}-${mainRoomId}-public-fallback`) % publicRooms.length];
  return methodRooms[0];
}

function mysteryMethodClues(method: string): string[] {
  const kind = mysteryMethodKind(method);
  if (kind === "drink") return [
    "A glass near {victim}'s seat carries bitter smell.",
    "A glass near {victim}'s body carries a hair strand that matches {killer}'s.",
    "A bar receipt shows {killer} ordered the same rare bottle later found beside {victim}."
  ];
  if (kind === "food") return [
    "A serving plate from {victim}'s setting contains a residue that was not found on the other plates.",
    "A kitchen order slip shows {killer} requested a private dish for {victim}.",
    "A discarded paper packet with poison residue was hidden behind the pantry flour tins."
  ];
  if (kind === "allergen") return [
    "The dessert served to {victim} contains an allergen that was not listed on the kitchen card.",
    "A torn menu note about {victim}'s allergy can be found in {killer}'s trash.",
    "The pantry jar holding the allergen was currently opened."
  ];
  if (kind === "drug") return [
    "A pill bottle with missing tablets was hidden in {killer}'s sock drawer.",
    "Powder residue was found in a folded paper inside {killer}'s coat pocket.",
    "The medicine cabinet log was altered beside the line for the dose used on {victim}."
  ];
  if (kind === "strangulation" || kind === "smother") return [
    "Fibers matching {killer}'s scarf were found near {victim}'s throat and collar.",
    "A torn strip of bedding hidden in a laundry basket in {killer}'s room matches marks on {victim}.",
    "A button from {killer}'s sleeve was found under {victim}'s shoulder."
  ];
  if (kind === "blade") return [
    "A sharp tool from the house inventory is missing and its slot was wiped clean.",
    "A knife-cleaning rag with diluted blood was found behind a loose drawer.",
    "A cut on {killer}'s hand matches the grip pattern of the missing blade."
  ];
  if (kind === "fire") return [
    "Burn residue was found where no lamp should have been used.",
    "A matchbook from {killer}'s room was found near the first point of ignition.",
    "The oil can in the service cupboard has a fresh smear of soot."
  ];
  if (kind === "gas") return [
    "Tool marks on the gas valve match a wrench kept in {killer}'s belongings.",
    "A corridor vent was deliberately blocked to push fumes toward {victim}.",
    "The service log for the gas line was changed after {victim}'s death."
  ];
  if (kind === "water") return [
    "Wet footprints lead away from the bath or water edge toward a service passage.",
    "A towel from {killer}'s room was found damp and hidden under folded linen.",
    "Scratches on the tub or pond stones show {victim} struggled before drowning."
  ];
  if (kind === "electric") return [
    "The damaged wire has a clean cut and a fresh repair wrap from the maintenance cupboard.",
    "A screwdriver with copper residue was found where {killer} had access.",
    "The fuse box was opened with a key that should not have left staff control."
  ];
  if (kind === "fall") return [
    "Scuff marks and a torn sleeve thread were found on the window frame or railing near the drop.",
    "A muddy footprint on the sill matches shoes kept in {killer}'s room.",
    "The latch was scratched from the inside, showing the fall was forced rather than accidental.",
    "A broken fingernail was caught in the balcony rail near where {victim} fell."
  ];
  if (kind === "vehicle") return [
    "The brake line shows a deliberate cut made with a narrow service blade.",
    "Grease on {killer}'s cuff matches the tampered vehicle mechanism.",
    "A garage key was returned late with fresh oil on its teeth."
  ];
  if (kind === "concealment") return [
    "Drag marks lead from the crime scene toward the place where the body was hidden.",
    "A sheet with traces of blood and floor dust was stuffed behind stored furniture.",
    "Mud on {killer}'s shoes matches the concealed body's hiding place."
  ];
  return [
    "A heavy object from the room is missing and dust marks show where it stood.",
    "A blood trace was wiped from the edge of a table near the attack.",
    "A bruise pattern on {victim} matches an object kept in {killer}'s belongings."
  ];
}

function mysteryMotiveClues(motive: string): string[] {
  const lower = motive.toLowerCase();
  if (lower.includes("inheritance") || lower.includes("will")) return [
    "A disputed will naming {victim} was hidden among {killer}'s papers.",
    "A letter from a solicitor shows {victim} could have changed the inheritance outcome.",
    "A torn inheritance note in {killer}'s drawer matches the argument {witness} overheard."
  ];
  if (lower.includes("debt") || lower.includes("gambling") || lower.includes("money")) return [
    "A debt ledger in {killer}'s room lists {victim}'s name beside an unpaid sum.",
    "A hidden stash of money was wrapped in a note demanding repayment before midnight.",
    "A betting slip links {killer}'s debt to a threat {victim} had planned to expose."
  ];
  if (lower.includes("affair") || lower.includes("relationship") || lower.includes("dating") || lower.includes("engagement") || lower.includes("widowed")) return [
    "A private letter proves {victim} knew about {killer}'s hidden relationship.",
    "A photograph tucked inside {killer}'s book connects the secret romance to {victim}'s threat.",
    "A torn note shows {victim} planned to reveal {killer}'s private relationship at breakfast."
  ];
  if (lower.includes("forged") || lower.includes("document")) return [
    "A forged document in {killer}'s handwriting was hidden inside a locked writing case in {killer}'s room.",
    "Ink and paper in {killer}'s room match the false document {victim} had discovered.",
    "A draft signature page proves {victim} could expose {killer}'s forgery."
  ];
  if (lower.includes("blackmail")) return [
    "A blackmail note in {victim}'s hand names {killer} and a deadline.",
    "A bundle of marked bills was hidden where {killer} could retrieve it.",
    "A diary entry shows {victim} intended to demand silence money from {killer}."
  ];
  if (lower.includes("stolen") || lower.includes("work") || lower.includes("bribing")) return [
    "A staff ledger shows missing money on shifts controlled by {killer}.",
    "A receipt hidden in {killer}'s bag connects the stolen funds to {victim}'s accusation.",
    "A note from {victim} warned {killer} that the theft would be reported."
  ];
  if (lower.includes("key") || lower.includes("forbidden room")) return [
    "A stolen key was hidden where {killer} thought no adult would search.",
    "Dust on a forbidden-room shelf shows {killer} entered before {victim} died.",
    "A written warning from {victim} names the forbidden room and {killer}'s lie."
  ];
  return [
    "A diary entry from {victim} names {killer} as the person they feared exposing.",
    "A hidden note explains why {victim}'s knowledge threatened {killer}.",
    "A torn page in {killer}'s room matches the secret {victim} had discovered."
  ];
}

function mysteryExtraClues(method: string): string[] {
  const kind = mysteryMethodKind(method);
  const shared = [
    "A fresh footprint can be fund in crime scene that matches the shoe type that {killer} wears.",
    "A dropped personal item belonging to {killer} was found on the route away from the scene.",
    "A bross that belong to {killer} was found under the nearest door.",
    "A servant's timing note contradicts {killer}'s public alibi."
  ];
  if (kind === "drink" || kind === "food" || kind === "allergen" || kind === "drug") {
    return [
      "A stained napkin from {victim}'s table was hidden in the wrong laundry basket.",
      "The dining seating card was moved so {killer} could reach {victim}'s serving.",
      "A cup or plate was removed from the scene before the police arrived.",
      ...shared
    ];
  }
  return shared;
}

function mysteryFindableAvailability(findable: MysteryFindable, day: number, daytime: Daytime): boolean {
  return !findable.collected && mysteryTimeHasArrived(day, daytime, findable.availableDay, findable.availableDaytime);
}

function mysteryInventoryIconFor(item: string): IconDumpKey | undefined {
  const lower = item.toLowerCase();
  if (/\b(betting slip|wager|gambling|bookmaker|racing stub)\b/.test(lower) && /\b(money|cash|note|debt|desperate)\b/.test(lower)) return "bettingSlipWithMoney";
  if (/\b(betting slip|wager|gambling|bookmaker|racing stub)\b/.test(lower)) return "bettingSlip";
  if (/\b(bribe|bribing|bribery)\b/.test(lower)) return "bribeNote";
  if (/\b(master room key|master key)\b/.test(lower)) return "masterKey";
  if (/\b(service key|service keys|staff key|staff keys|grand hall service key)\b/.test(lower)) return "serviceKeys";
  if (/\b(guest room|room key)\b/.test(lower)) return "guestRoomKey";
  if (/\bdiary key\b/.test(lower)) return "diaryKey";
  if (/\bgarage key\b/.test(lower)) return "key";
  if (/\b(wedding invitation|wedding invite|engagement invitation)\b/.test(lower)) return "weddingInvitation";
  if (/\b(funeral programme|funeral program|memorial programme|memorial program)\b/.test(lower)) return "funeralProgramme";
  if (/\b(press clipping|clipping|part of newspaper)\b/.test(lower)) return "newspaperClipping";
  if (/\b(newspaper|newspapers|article|articles|scandal column|columns)\b/.test(lower)) return "newspaper";
  if (/\b(cigarette case|silver cigarette case|engraved cigarette case)\b/.test(lower)) return "cigaretteCase";
  if (/\b(cigarette|cigarettes|tobacco|cigar|cigars)\b/.test(lower)) return "cigarettes";
  if (/\b(condom|condoms|contraceptive|contraceptives)\b/.test(lower)) return "condom";
  if (/\b(lighter)\b/.test(lower)) return "lighter";
  if (/\b(matchbox|match box|matchbook|match book|matches)\b/.test(lower)) return "matchBox";
  if (/\b(telephone|phone|receiver|handset)\b/.test(lower)) return "telephone";
  if (/\b(handgun|gun|pistol|revolver|firearm|bullet|bullets|cartridge|cartridges)\b/.test(lower)) return "handgun";
  if (/\b(knife|letter opener|blade|sharp tool)\b/.test(lower)) return "knife";
  if (/\b(screwdriver)\b/.test(lower)) return "screwdriver";
  if (/\b(wrench|gas valve)\b/.test(lower)) return "wrench";
  if (/\b(electrical wire|wire|copper residue|tampered wire)\b/.test(lower)) return "electricalWire";
  if (/\b(lock-picking|lock picking|lockpick|lockpicks)\b/.test(lower)) return "lockpicks";
  if (/\b(fishing line)\b/.test(lower)) return "thread";
  if (/\b(thread|sewing|sewing kit)\b/.test(lower)) return "sewingKit";
  if (/\b(fabric strip|torn fabric|scarf|ribbon)\b/.test(lower)) return "tornFabric";
  if (/\b(towel|cloth|handkerchief|napkin|rag|dusty sheet|linen)\b/.test(lower)) return "towel";
  if (/\b(candlestick|candle stick|brass candlestick)\b/.test(lower)) return "candlestick";
  if (/\b(candle|lantern)\b/.test(lower)) return "candle";
  if (/\b(bottle with tag|bottle with label|labelled bottle|labeled bottle|tagged bottle|liquor bottle|medicine bottle|bottle)\b/.test(lower)) return "bottleWithTag";
  if (/\b(wine glass|champagne glass|broken glass|poisoned glass|glass)\b/.test(lower)) return "wineGlass";
  if (/\b(coffee cup|cup)\b/.test(lower)) return "cup";
  if (/\b(serving plate|plate)\b/.test(lower)) return "plate";
  if (/\b(teaspoon|spoon)\b/.test(lower)) return "spoon";
  if (/\b(polaroid|camera|photo machine|disposable camera)\b/.test(lower)) return "camera";
  if (/\b(cassette|tape|recorded argument)\b/.test(lower)) return "cassette";
  if (/\b(pocket watch|watch)\b/.test(lower)) return "pocketWatch";
  if (/\b(cufflink|cufflinks|cuff link|cuff links|button|buttons|jewellery|jewelry)\b/.test(lower)) return "cuffLink";
  if (/\b(locket|ring|engagement ring|medal|token)\b/.test(lower)) return "locket";
  if (/\b(round glasses|spectacles|eyeglasses|glasses)\b/.test(lower)) return "roundGlasses";
  if (/\b(lipstick|makeup|make-up|rouge|powder compact|compact)\b/.test(lower)) return "lipstick";
  if (/\b(perfume)\b/.test(lower)) return "perfume";
  if (/\b(hair lock|lock of hair)\b/.test(lower)) return "hairLock";
  if (/\b(comb|hair comb)\b/.test(lower)) return "comb";
  if (/\b(bra|brassiere|lingerie)\b/.test(lower)) return "bra";
  if (/\b(sock|socks|stocking|stockings)\b/.test(lower)) return "sock";
  if (/\b(toy|doll|teddy|child's|children's|childrens|crayon|marble|marbles)\b/.test(lower)) return "childToy";
  if (/\b(drawing)\b/.test(lower)) return "childrenToy";
  if (/\b(pregnancy test|pregnancy-test)\b/.test(lower)) return "pregnancyTest";
  if (/\b(syringe)\b/.test(lower)) return "syringe";
  if (/\b(sleeping-pill|sleeping pill|sleeping-pills|sleeping pills)\b/.test(lower)) return "sleepingPills";
  if (/\b(poison|rat poison|cleaning fluid)\b/.test(lower)) return "poison";
  if (/\b(vial|vials|medicine|prescription|aspirin|drug container|drug containers|empty drug|ampoule|ampoules|medicine tin)\b/.test(lower)) return "vial";
  if (/\b(wallet)\b/.test(lower)) return "wallet";
  if (/\b(gloves|latex gloves)\b/.test(lower)) return "gloves";
  if (/\b(shovel)\b/.test(lower)) return "shovel";
  if (/\b(herb bundle|herbs|dried herbs|bouquet|flowers|flower bundle|wrapped flowers)\b/.test(lower)) return "herbBundle";
  if (/\b(mint gum|chewing gum|gum packet|gum pack|mint packet|mint sweets|mints)\b/.test(lower)) return "mintGum";
  if (/\b(sweet wrapper|wrapper)\b/.test(lower)) return "sweetWrapper";
  if (/\b(romance novel|novel|book)\b/.test(lower)) return "romanceNovel";
  if (/\b(pencil)\b/.test(lower)) return "pencil";
  if (/\b(fountain pen|pen)\b/.test(lower)) return "pen";
  if (/\b(forged id|id card|identification card|university identification)\b/.test(lower)) return "forgedId";
  if (/\b(will|inheritance)\b/.test(lower)) return "forgedWill";
  if (/\b(badge)\b/.test(lower)) return "policeBadge";
  if (/\b(ticket|calling card|membership card|business card|card)\b/.test(lower)) return "ticket";
  if (/\b(map)\b/.test(lower)) return "map";
  if (/\b(photo|photograph|portrait)\b/.test(lower)) return "portrait";
  if (/\b(ledger page|ledger note|debt ledger|room ledger|notebook|notes|list|statement)\b/.test(lower)) return "notes";
  if (/\b(letter with document|divorce papers|adoption document|document draft|papers)\b/.test(lower)) return "letterWithDocument";
  if (/\b(card|cards|deck)\b/.test(lower)) return "cards";
  if (/\bkey\b/.test(lower)) return "key";
  if (/\b(letter|letters|envelope|envelopes|apology|threatening)\b/.test(lower)) return "letter";
  if (/\b(money|coin|coins|gold|cash|bill|bills|fund|funds|currency)\b/.test(lower)) return "money";
  if (/\b(receipt|programme|program|permit|contract|deed|certificate|catalogue|catalog|schedule|tag|chit)\b/.test(lower)) return "document";
  if (/\b(document|documents|paper|papers|ledger|slip|slips|will|id card|identification|receipt|programme|program|permit|contract|deed|certificate|notebook|note|newspaper|article|catalogue|catalog|map|photo|photograph|drawing|invitation|badge|ticket|statement|list)\b/.test(lower)) return "document";
  return "bag";
}

type MysteryPreciseProof = {
  name: string;
  description: string;
  locationNote: string;
  searchDifficulty: MysteryRollOutcome["tier"];
};

function mysteryPreciseMotiveProof(motive: string, killer: MysteryNpc, victim: MysteryNpc): MysteryPreciseProof {
  const lower = motive.toLowerCase();
  if (lower.includes("police") || lower.includes("earlier killing") || lower.includes("previous murder") || lower.includes("had killed")) {
    return {
      name: `Unsent statement by ${fullName(victim)} accusing ${fullName(killer)} of an earlier murder`,
      description: `Unsent statement by ${fullName(victim)} accusing ${fullName(killer)} of an earlier murder and naming the earlier victim.`,
      locationNote: `hidden inside ${fullName(victim)}'s writing case`,
      searchDifficulty: "medium"
    };
  }
  if (lower.includes("forged") || lower.includes("document")) {
    return {
      name: `Forged ID card with ${fullName(killer)}'s photo on it`,
      description: `Forged ID card with ${fullName(killer)}'s photo on it, proving the identity lie ${fullName(victim)} was ready to expose.`,
      locationNote: `under the bed in ${fullName(killer)}'s room`,
      searchDifficulty: "medium"
    };
  }
  if (lower.includes("debt") || lower.includes("gambling") || lower.includes("money")) {
    return {
      name: `Debt ledger page listing ${fullName(killer)} owed ${fullName(victim)} money`,
      description: `Debt ledger page listing ${fullName(killer)} owed ${fullName(victim)} a large sum of money, and the payback deadline was the day of the murder.`,
      locationNote: `inside the locked writing case in ${fullName(killer)}'s room`,
      searchDifficulty: "medium"
    };
  }
  if (lower.includes("inheritance") || lower.includes("will")) {
    return {
      name: `Altered inheritance letter naming ${fullName(killer)} and ${fullName(victim)}`,
      description: `Altered inheritance letter naming ${fullName(killer)} and showing why ${fullName(victim)} could ruin the inheritance plan.`,
      locationNote: `folded into the lining of ${fullName(killer)}'s travel bag`,
      searchDifficulty: "medium"
    };
  }
  if (lower.includes("relationship") || lower.includes("dating") || lower.includes("engagement") || lower.includes("affair")) {
    return {
      name: `Private letter proving ${fullName(victim)} knew about ${fullName(killer)}'s hidden relationship`,
      description: `Private letter proving ${fullName(victim)} knew about ${fullName(killer)}'s hidden relationship and planned to make it public.`,
      locationNote: `inside a book on ${fullName(killer)}'s bedside table`,
      searchDifficulty: "medium"
    };
  }
  if (lower.includes("blackmail")) {
    return {
      name: `Blackmail note naming ${fullName(killer)} with ${fullName(victim)}'s deadline`,
      description: `Blackmail note naming ${fullName(killer)} with ${fullName(victim)}'s deadline, proving the pressure was immediate.`,
      locationNote: `behind a loose drawer in ${fullName(victim)}'s room`,
      searchDifficulty: "hard"
    };
  }
  if (lower.includes("stolen") || lower.includes("theft") || lower.includes("brib")) {
    return {
      name: `Marked cash envelope tied to ${fullName(killer)}'s theft`,
      description: `Marked cash envelope tied to ${fullName(killer)}'s theft, matching money ${fullName(victim)} had noticed missing.`,
      locationNote: `behind folded linen in ${fullName(killer)}'s room`,
      searchDifficulty: "medium"
    };
  }
  return {
    name: `Torn note explaining why ${fullName(victim)} threatened ${fullName(killer)}`,
    description: `Torn note explaining why ${fullName(victim)} threatened ${fullName(killer)} on the day they died.`,
    locationNote: `under the writing blotter in ${fullName(killer)}'s room`,
    searchDifficulty: "medium"
  };
}

function mysteryPreciseMethodProof(method: string, killer: MysteryNpc, victim: MysteryNpc, roomName: string): MysteryPreciseProof {
  const kind = mysteryMethodKind(method);
  const proof = (name: string, description: string, searchDifficulty: MysteryRollOutcome["tier"] = "hard"): MysteryPreciseProof => ({
    name,
    description,
    locationNote: `in ${roomName} after ${fullName(victim)}'s dead body is found`,
    searchDifficulty
  });
  if (kind === "drink") return proof(`Poisoned glass from ${fullName(victim)}'s place setting`, `Poisoned glass from ${fullName(victim)}'s place setting with ${fullName(killer)}'s fingerprint on the stem.`);
  if (kind === "food") return proof(`Serving plate from ${fullName(victim)}'s setting`, `Serving plate from ${fullName(victim)}'s setting with residue from ${fullName(killer)}'s private packet.`);
  if (kind === "allergen") return proof(`Kitchen allergy card altered in ${fullName(killer)}'s handwriting`, `Kitchen allergy card altered in ${fullName(killer)}'s handwriting, showing the allergen was introduced deliberately.`);
  if (kind === "drug") return proof(`Medicine vial with missing dose`, `Medicine vial with missing dose and ${fullName(killer)}'s initials scratched into the label.`);
  if (kind === "strangulation" || kind === "smother") return proof(`Torn fabric strip matching ${fullName(killer)}'s scarf`, `Torn fabric strip matching ${fullName(killer)}'s scarf and marks on ${fullName(victim)}.`);
  if (kind === "blade") return proof(`Bloodied letter opener wrapped in ${fullName(killer)}'s handkerchief`, `Bloodied letter opener wrapped in ${fullName(killer)}'s handkerchief.`);
  if (kind === "fire") return proof(`Matchbook from ${fullName(killer)}'s room`, `Matchbook from ${fullName(killer)}'s room found at the first burn point.`, "medium");
  if (kind === "gas") return proof(`Gas valve wrench with fresh marks`, `Gas valve wrench with fresh marks matching ${fullName(killer)}'s service access.`);
  if (kind === "water") return proof(`Damp towel from ${fullName(killer)}'s room`, `Damp towel from ${fullName(killer)}'s room hidden after ${fullName(victim)} drowned.`);
  if (kind === "electric") return proof(`Screwdriver with copper residue`, `Screwdriver with copper residue from the tampered wire near ${fullName(victim)}.`);
  if (kind === "fall") return proof(`Cuff link belonging to ${fullName(killer)}`, `Cuff link belonging to ${fullName(killer)} found at the top of the staircase or nearest fall point.`, "medium");
  if (kind === "vehicle") return proof(`Garage key with fresh oil`, `Garage key with fresh oil from the cut brake line.`);
  if (kind === "concealment") return proof(`Dusty sheet used to drag ${fullName(victim)} from ${roomName}`, `Dusty sheet used to drag ${fullName(victim)} from ${roomName}.`);
  return proof(`Heavy room ornament with wiped blood trace`, `Heavy room ornament with wiped blood trace and fibers from ${fullName(killer)}'s cuff.`);
}

function mysteryDramaFindableForNpc(npc: MysteryNpc, rooms: MysteryRoom[]): MysteryFindable {
  const room = rooms.find((candidate) => candidate.id === npc.roomId) ?? rooms.find((candidate) => candidate.id === npc.stationRoomId) ?? rooms[0];
  const socialRoomId = ravenwoodSocialRooms[stableHash(`${npc.id}-drama-room`) % ravenwoodSocialRooms.length];
  const lowerSecret = npc.secret.toLowerCase();
  const lowerStatus = npc.familyStatus.toLowerCase();
  const lowerOccupation = npc.occupation.toLowerCase();
  const held = stableHash(`${npc.id}-drama-held`) % 100 < 72;
  let name = `Private letter addressed to ${fullName(npc)}`;
  let description = `A private letter that makes ${fullName(npc)} look suspicious for personal reasons, not because it proves murder.`;
  let roomId = held ? undefined : room?.id;
  let holderNpcId = held ? npc.id : undefined;

  if (lowerSecret.includes("forged") || lowerSecret.includes("document") || lowerSecret.includes("will")) {
    name = `Suspicious document draft tied to ${fullName(npc)}`;
    description = `A document draft that points to ${fullName(npc)}'s private trouble, but does not match any murder proof.`;
  } else if (lowerSecret.includes("debt") || lowerSecret.includes("gambling") || lowerSecret.includes("money") || lowerOccupation.includes("bank") || lowerOccupation.includes("account")) {
    name = `A betting slip and small money note with ${fullName(npc)}'s initials, that makes ${fullName(npc)} look desperate`;
    description = "";
  } else if (lowerSecret.includes("relationship") || lowerSecret.includes("dating") || lowerStatus.includes("dating") || lowerStatus.includes("engaged") || lowerStatus.includes("relationship")) {
    name = `Love letter hidden by ${fullName(npc)}`;
    description = `A love letter that exposes ${fullName(npc)}'s private relationship trouble without proving a killing.`;
  } else if (lowerSecret.includes("medicine") || lowerOccupation.includes("doctor") || lowerOccupation.includes("nurse")) {
    name = `Empty drug vial from ${fullName(npc)}'s bag`;
    description = `An empty drug container linked to ${fullName(npc)}'s private habits or work, but not to the murder method.`;
  } else if (lowerOccupation.includes("journalist") || lowerOccupation.includes("author") || lowerOccupation.includes("archivist") || lowerOccupation.includes("clerk")) {
    name = `Notebook page with ${fullName(npc)}'s private notes`;
    description = `A notebook page full of names and times that can distract the investigation without matching the murder proof.`;
  } else if (mysteryDisplaySubstancePreference(npc).includes("cigarettes")) {
    name = `Cigarette case engraved for ${fullName(npc)}`;
    description = `A cigarette case that places ${fullName(npc)} in social rooms often, but does not prove a crime.`;
    roomId = held ? undefined : socialRoomId;
  } else if (lowerOccupation.includes("card")) {
    name = `Marked deck of cards near ${fullName(npc)}`;
    description = `A marked deck connected to ${fullName(npc)}'s private games and wagers, unrelated to the murder proof.`;
    roomId = held ? undefined : "smoking-room";
  }

  return {
    id: uid(),
    kind: "Snatchable",
    origin: "Drama",
    name,
    description,
    roomId,
    holderNpcId,
    availableDay: 1,
    availableDaytime: (["Morning", "Midday", "Afternoon"] as Daytime[])[stableHash(`${npc.id}-drama-time`) % 3]
  };
}

function mysteryNpcInitials(npc: MysteryNpc): string {
  return `${npc.firstName.charAt(0)}.${npc.familyName.charAt(0)}.`;
}

function mysteryNeutralRoomId(rooms: MysteryRoom[], seed: string, preferred: string[] = ravenwoodCommonRooms): string {
  const candidates = preferred
    .map((roomId) => rooms.find((room) => room.id === roomId))
    .filter((room): room is MysteryRoom => Boolean(room));
  const pool = candidates.length > 0 ? candidates : rooms.filter((room) => room.accessible);
  return (pool[stableHash(seed) % pool.length] ?? rooms[0]).id;
}

function mysteryNeutralFindable(name: string, description: string, rooms: MysteryRoom[], seed: string, preferredRooms?: string[], holderNpcId?: string): MysteryFindable {
  return {
    id: uid(),
    kind: "Snatchable",
    origin: "Neutral",
    name,
    description,
    roomId: holderNpcId ? undefined : mysteryNeutralRoomId(rooms, seed, preferredRooms),
    holderNpcId,
    availableDay: 1,
    availableDaytime: (["Morning", "Breakfast", "Midday", "Afternoon"] as Daytime[])[stableHash(`${seed}-time`) % 4]
  };
}

function mysteryNeutralHouseFindablesForScenario(npcs: MysteryNpc[], rooms: MysteryRoom[], relationships: MysteryNpcRelationship[]): MysteryFindable[] {
  const findables: MysteryFindable[] = [];
  const add = (name: string, description: string, seed: string, preferredRooms?: string[], holderNpcId?: string) => {
    if (!findables.some((item) => item.name === name)) findables.push(mysteryNeutralFindable(name, description, rooms, seed, preferredRooms, holderNpcId));
  };
  const adults = npcs.filter((npc) => npc.age >= 18);
  const children = npcs.filter((npc) => npc.age < 13);
  const smokers = npcs.filter((npc) => mysteryDisplaySubstancePreference(npc).includes("cigarettes"));
  const drinkers = npcs.filter((npc) => mysteryDisplaySubstancePreference(npc).includes("alcohol"));
  const romanceResidents = npcs.filter((npc) => /dating|engaged|relationship|married|open to explore/i.test(npc.familyStatus));
  const divorcedResidents = npcs.filter((npc) => /divorced|on a break/i.test(npc.familyStatus));
  const memorialGuests = npcs.filter((npc) => /memorial|funeral/i.test(npc.reasonOfStay));
  const weddingGuests = npcs.filter((npc) => /wedding|engagement/i.test(npc.reasonOfStay));
  const inheritanceGuests = npcs.filter((npc) => /inheritance|lawyer/i.test(npc.reasonOfStay) || /will|inheritance/i.test(npc.secret));
  const travelers = npcs.filter((npc) => npc.role === "Guest");
  const medicalResidents = npcs.filter((npc) => /doctor|nurse|medical|first aid/i.test(npc.occupation) || /medicine|illness/i.test(`${npc.secret} ${npc.reasonOfStay}`));
  const writers = npcs.filter((npc) => /author|journalist|archivist|clerk|poet|secretary|office/i.test(npc.occupation));
  const staff = npcs.filter((npc) => npc.role === "Staff");
  const military = npcs.filter((npc) => /military|police|security/i.test(npc.occupation));
  const students = npcs.filter((npc) => npc.age >= 16 && /student|university|school/i.test(`${npc.occupation} ${npc.education}`));
  const firstAdult = adults[0];

  add("lantern", "A working lantern that can make night searches easier or help reassure nervous residents.", "neutral-lantern", ["grand-hall", "back-stairs", "staff-corridor"]);
  add("gloves", "A pair of plain gloves useful for handling dusty or suspicious objects without making a scene.", "neutral-gloves", ["laundry", "staff-corridor", "servants-hall"]);
  add("hotel stationery and envelopes", "Ravenwood stationery with clean envelopes, useful for notes, lures, or comparing handwriting.", "neutral-stationery", ["library", "grand-hall", "drawing-room"]);
  add("fountain pen", "A good fountain pen from a writing desk, useful for notes or testing ink against documents.", "neutral-fountain-pen", ["library", "drawing-room"]);
  add("silver-plated teaspoon", "A silver-plated teaspoon from hotel service, useful for stirring, testing residue, or distracting staff.", "neutral-teaspoon", ["dining-room", "kitchen", "drawing-room"]);
  add("sewing kit from the hotel", "A hotel sewing kit with thread, needles, and spare buttons.", "neutral-sewing-kit", ["laundry", "servants-hall"]);
  add("comb", "A small comb left near a mirror, useful for personal grooming or comparing hair.", "neutral-comb", ["west-gallery", "drawing-room"]);
  add("folded newspaper", "A folded newspaper from the outside world, useful for dates, rumors, and conversation bait.", "neutral-newspaper", ["grand-hall", "smoking-room", "library"]);
  add("cheap plastic lighter", "A cheap plastic lighter, useful for candles, cigarettes, or testing who reacts too quickly.", "neutral-lighter", ["smoking-room", "garden-terrace"]);
  add("polaroid photo machine", "A Polaroid camera that can make instant records of rooms, objects, or reluctant residents.", "neutral-polaroid", ["library", "drawing-room"]);
  add("cassette tape without a label", "An unlabeled cassette tape that could hold music, dictation, or something a resident forgot.", "neutral-cassette", ["library", "billiards-room"]);
  add("spare camera battery", "A spare camera battery useful for testing cameras or trading with residents who take photographs.", "neutral-camera-battery", ["library", "west-gallery"]);
  add("disposable camera", "A disposable camera with a few shots left.", "neutral-disposable-camera", ["garden-terrace", "west-gallery"]);
  add("telephone calling card", "A telephone calling card, useless for outside lines now but valuable to someone who expected to call away.", "neutral-calling-card", ["grand-hall", "staff-corridor"]);
  add("shoe-polishing cloth", "A shoe-polishing cloth with dark polish marks.", "neutral-shoe-cloth", ["servants-hall", "laundry"]);
  add("diary key", "A tiny diary key with no diary attached yet, useful when searching private desks or bags.", "direct-diary-key", ["library", "west-gallery"]);
  add("handgun", "A handgun locked in an old case, dangerous as proof, leverage, or a terrible choice.", "direct-handgun", ["billiards-room", "library"]);
  add("kitchen knife wrapped in cloth", "A kitchen knife wrapped in cloth, suspicious even when it is not connected to the murder.", "direct-wrapped-knife", ["kitchen", "pantry"]);
  add("latex gloves", "Latex gloves that can keep fingerprints off an item, or make someone look prepared for trouble.", "direct-latex-gloves", ["laundry", "servants-hall"]);
  add("empty sleeping-pill packet", "An empty sleeping-pill packet that could be medicine, panic, or misdirection.", "direct-sleeping-pills", ["guest-room-1", "guest-room-2", "servants-hall"]);
  add("torn strip of fabric", "A torn strip of fabric caught on a nail, useful for comparing with clothes or bags.", "direct-fabric-strip", ["back-stairs", "west-gallery"]);
  add("coil of electrical wire", "A coil of electrical wire from a maintenance shelf.", "direct-electrical-wire", ["staff-corridor", "back-stairs"]);
  add("heavy brass candlestick", "A heavy brass candlestick from a side table.", "direct-brass-candlestick", ["drawing-room", "library"]);
  add("bottle labelled poison containing cleaning fluid", "A bottle labelled poison that actually contains cleaning fluid, perfect for panic or a false lead.", "direct-fake-poison", ["laundry", "pantry"]);
  add("hunting catalogue", "A hunting catalogue with several pages folded down.", "direct-hunting-catalogue", ["billiards-room", "smoking-room"]);
  add("shovel with fresh soil on it", "A shovel with fresh soil on it, left where it should have been cleaned.", "direct-soil-shovel", ["garden-terrace", "staff-corridor"]);
  add("damp towel smelling of chemicals", "A damp towel smelling of chemicals.", "direct-chemical-towel", ["laundry", "servants-hall"]);
  add("blackmail-style note written as a joke", "A blackmail-style note written as a joke, useful mainly for confusing everyone.", "direct-joke-blackmail-note", ["library", "billiards-room"]);
  add("map with several rooms circled", "A map with several rooms circled, possibly a plan or possibly nervous doodling.", "direct-circled-map", ["grand-hall", "library"]);
  add("cassette containing a recorded argument", "A cassette that appears to contain a recorded argument.", "direct-recorded-argument", ["billiards-room", "library"]);
  add("anonymous threatening letter from years ago", "An anonymous threatening letter from years ago, kept for reasons no one wants to explain.", "direct-old-threat", ["library", "guest-room-3"]);
  add("fishing line", "A length of fishing line, almost invisible when pulled tight.", "direct-fishing-line", ["garden-terrace", "back-stairs"]);
  add("broken champagne glass", "A broken champagne glass wrapped in a napkin.", "direct-broken-glass", ["dining-room", "drawing-room"]);
  add("spare master key", "A spare master key that opens every guest room if the player can keep hold of it.", "direct-spare-master-key", ["grand-hall", "staff-corridor"]);
  add("bottle of rat poison", "A bottle of rat poison from service storage.", "direct-rat-poison", ["pantry", "staff-corridor"]);
  add("newspaper article about an unsolved murder", "A newspaper article about an unsolved murder with Ravenwood-like details.", "direct-unsolved-murder-article", ["library", "smoking-room"]);
  add("anonymous hotel complaint", "An anonymous hotel complaint accusing staff of snooping and favoritism.", "direct-hotel-complaint", ["grand-hall", "servants-hall"]);

  if (firstAdult) add(`reading glasses in a leather case marked ${mysteryNpcInitials(firstAdult)}`, `Reading glasses in a leather case marked with ${fullName(firstAdult)}'s initials.`, `${firstAdult.id}-glasses`, ["library", "drawing-room"], stableHash(`${firstAdult.id}-glasses-held`) % 100 < 45 ? firstAdult.id : undefined);
  if (firstAdult) add(`handkerchief embroidered ${mysteryNpcInitials(firstAdult)}`, `A handkerchief embroidered with ${fullName(firstAdult)}'s initials.`, `${firstAdult.id}-handkerchief`, ["dining-room", "west-gallery"], stableHash(`${firstAdult.id}-handkerchief-held`) % 100 < 45 ? firstAdult.id : undefined);
  if (firstAdult) add(`broken pocket watch belonging to ${fullName(firstAdult)}`, `A broken pocket watch linked to ${fullName(firstAdult)}, stopped at an unhelpful but suggestive time.`, `${firstAdult.id}-watch`, ["library", "billiards-room"]);
  if (firstAdult) add(`loose coat button from ${fullName(firstAdult)}`, `A loose coat button that appears to match ${fullName(firstAdult)}'s clothes.`, `${firstAdult.id}-button`, ["grand-hall", "back-stairs"]);
  if (firstAdult) add(`engraved cufflink with ${mysteryNpcInitials(firstAdult)}`, `An engraved cufflink with ${fullName(firstAdult)}'s initials.`, `${firstAdult.id}-cufflink`, ["dining-room", "billiards-room"]);
  if (firstAdult) add(`list of telephone numbers in ${fullName(firstAdult)}'s handwriting`, `A list of telephone numbers written in ${fullName(firstAdult)}'s hand.`, `${firstAdult.id}-phone-list`, ["library", "grand-hall"]);

  for (const npc of smokers.slice(0, 3)) {
    add(`cigarettes belonging to ${fullName(npc)}`, `${fullName(npc)}'s cigarettes, useful as a favor or a way to start a conversation.`, `${npc.id}-cigarettes`, ["smoking-room", "garden-terrace"], stableHash(`${npc.id}-cigarettes-held`) % 100 < 55 ? npc.id : undefined);
    add(`cigarette case engraved for ${fullName(npc)}`, `A cigarette case connected to ${fullName(npc)}.`, `${npc.id}-cigarette-case`, ["smoking-room"], stableHash(`${npc.id}-case-held`) % 100 < 60 ? npc.id : undefined);
  }
  for (const npc of children.slice(0, 2)) {
    add(`child's toy belonging to ${fullName(npc)}`, `A small toy belonging to ${fullName(npc)}, useful for calming or questioning younger residents.`, `${npc.id}-toy`, ["grand-hall", "garden-terrace"], stableHash(`${npc.id}-toy-held`) % 100 < 40 ? npc.id : undefined);
    add(`child's drawing of the mansion by ${fullName(npc)}`, `A child's drawing of Ravenwood by ${fullName(npc)}, with rooms exaggerated in strange ways.`, `${npc.id}-drawing`, ["library", "grand-hall"]);
  }
  for (const npc of medicalResidents.slice(0, 3)) {
    add(`small bottle of aspirin belonging to ${fullName(npc)}`, `A small bottle of aspirin connected to ${fullName(npc)}.`, `${npc.id}-aspirin`, ["drawing-room", "servants-hall"], stableHash(`${npc.id}-aspirin-held`) % 100 < 50 ? npc.id : undefined);
    add(`prescription bottle belonging to ${fullName(npc)}`, `A prescription bottle belonging to ${fullName(npc)}.`, `${npc.id}-prescription`, ["guest-room-1", "guest-room-2", "servants-hall"], stableHash(`${npc.id}-prescription-held`) % 100 < 65 ? npc.id : undefined);
    add(`syringe belonging to diabetic guest ${fullName(npc)}`, `A syringe belonging to ${fullName(npc)}, present because of medicine rather than murder by default.`, `${npc.id}-diabetic-syringe`, ["guest-room-1", "guest-room-2"], stableHash(`${npc.id}-syringe-held`) % 100 < 60 ? npc.id : undefined);
  }
  for (const npc of romanceResidents.slice(0, 4)) {
    add(`tiny bottle of perfume belonging to ${fullName(npc)}`, `A tiny bottle of perfume associated with ${fullName(npc)}.`, `${npc.id}-perfume`, ["drawing-room", "west-gallery"], stableHash(`${npc.id}-perfume-held`) % 100 < 45 ? npc.id : undefined);
    add(`locket containing an unfamiliar photograph carried by ${fullName(npc)}`, `A locket connected to ${fullName(npc)} with an unfamiliar photograph inside.`, `${npc.id}-locket`, ["library", "garden-terrace"], stableHash(`${npc.id}-locket-held`) % 100 < 55 ? npc.id : undefined);
    add(`love letter signed only ${mysteryNpcInitials(npc)}`, `A love letter signed only with the initials ${mysteryNpcInitials(npc)}, matching ${fullName(npc)}.`, `${npc.id}-love-letter`, ["library", "drawing-room"]);
    add(`cheap engagement ring tied to ${fullName(npc)}`, `A cheap engagement ring that may embarrass ${fullName(npc)} more than incriminate them.`, `${npc.id}-ring`, ["west-gallery", "garden-terrace"], stableHash(`${npc.id}-ring-held`) % 100 < 45 ? npc.id : undefined);
  }
  for (const npc of divorcedResidents.slice(0, 2)) add(`divorce papers hidden in an envelope for ${fullName(npc)}`, `Divorce papers in an envelope connected to ${fullName(npc)}.`, `${npc.id}-divorce`, ["library", "guest-room-1", "guest-room-2"]);
  for (const npc of writers.slice(0, 3)) add(`notebook filled with ${fullName(npc)}'s obsessive observations`, `A notebook filled with obsessive observations by ${fullName(npc)}.`, `${npc.id}-obsession-notebook`, ["library", "smoking-room"], stableHash(`${npc.id}-notebook-held`) % 100 < 50 ? npc.id : undefined);
  for (const npc of travelers.slice(0, 3)) {
    add(`shopping receipt from ${fullName(npc)}'s luggage`, `A shopping receipt from ${fullName(npc)}'s luggage.`, `${npc.id}-receipt`, ["grand-hall", "guest-room-1", "guest-room-2"]);
    add(`business card with ${fullName(npc)}'s handwritten room number`, `A business card with a handwritten room number connected to ${fullName(npc)}.`, `${npc.id}-business-card`, ["grand-hall", "dining-room"]);
  }
  for (const npc of memorialGuests.slice(0, 2)) add(`funeral programme for ${fullName(npc)}'s visit`, `A funeral programme that fits ${fullName(npc)}'s reason for staying at Ravenwood.`, `${npc.id}-funeral`, ["library", "drawing-room"]);
  for (const npc of weddingGuests.slice(0, 2)) add(`old wedding invitation addressed to ${fullName(npc)}`, `An old wedding invitation addressed to ${fullName(npc)}.`, `${npc.id}-wedding-invitation`, ["drawing-room", "grand-hall"]);
  for (const npc of inheritanceGuests.slice(0, 2)) add(`pawnshop receipt connected to ${fullName(npc)}`, `A pawnshop receipt that may affect money or inheritance questions around ${fullName(npc)}.`, `${npc.id}-pawnshop`, ["library", "grand-hall"]);
  for (const npc of drinkers.slice(0, 2)) add(`sobriety token belonging to ${fullName(npc)}`, `A sobriety token belonging to ${fullName(npc)}.`, `${npc.id}-sobriety-token`, ["smoking-room", "garden-terrace"], stableHash(`${npc.id}-sobriety-held`) % 100 < 45 ? npc.id : undefined);
  for (const npc of military.slice(0, 2)) add(`military medal belonging to ${fullName(npc)}`, `A military medal connected to ${fullName(npc)}.`, `${npc.id}-medal`, ["library", "guest-room-1"], stableHash(`${npc.id}-medal-held`) % 100 < 50 ? npc.id : undefined);
  for (const npc of staff.slice(0, 2)) add(`employee badge from another hotel belonging to ${fullName(npc)}`, `An employee badge from another hotel belonging to ${fullName(npc)}, suggesting previous hotel work before Ravenwood.`, `${npc.id}-other-hotel-badge`, ["servants-hall", "staff-corridor"], npc.id);
  for (const npc of staff.filter((candidate) => /maintenance|porter|cleaner|gardener|security|butler|housekeeper/i.test(candidate.occupation)).slice(0, 2)) {
    add(`lock-picking tools belonging to maintenance staff ${fullName(npc)}`, `Lock-picking tools belonging to ${fullName(npc)}, difficult to steal cleanly and very hard to explain.`, `${npc.id}-lockpicks`, ["staff-corridor", "servants-hall"], npc.id);
  }
  for (const npc of students.slice(0, 2)) add(`university identification card for ${fullName(npc)}`, `A university identification card for ${fullName(npc)}.`, `${npc.id}-student-id`, ["library", "grand-hall"], stableHash(`${npc.id}-id-held`) % 100 < 45 ? npc.id : undefined);
  for (const npc of travelers.slice(0, 2)) add(`plane ticket booked under ${npc.familyName}'s false surname`, `A plane ticket booked under a false surname that resembles ${fullName(npc)}'s family name.`, `${npc.id}-plane-ticket`, ["grand-hall", "library"]);
  for (const npc of adults.slice(0, 2)) add(`membership card for a private club issued to ${fullName(npc)}`, `A membership card for a private club issued to ${fullName(npc)}.`, `${npc.id}-club-card`, ["billiards-room", "smoking-room"], stableHash(`${npc.id}-club-held`) % 100 < 40 ? npc.id : undefined);
  if (relationships.length > 0) {
    const linked = relationships
      .map((relationship) => {
        const from = npcs.find((npc) => npc.id === relationship.fromId);
        const to = npcs.find((npc) => npc.id === relationship.toId);
        return from && to ? { from, to, relationship } : null;
      })
      .filter((item): item is { from: MysteryNpc; to: MysteryNpc; relationship: MysteryNpcRelationship } => Boolean(item));
    for (const item of linked.slice(0, 3)) {
      add(`photograph of ${fullName(item.from)} and ${fullName(item.to)} together years earlier`, `A photograph of ${fullName(item.from)} and ${fullName(item.to)} together years earlier.`, `${item.relationship.id}-old-photo`, ["library", "drawing-room"]);
    }
    for (const item of linked.filter((entry) => entry.relationship.kind === "Family" && (entry.from.age < 18 || entry.to.age < 18)).slice(0, 2)) {
      const child = item.from.age < item.to.age ? item.from : item.to;
      add(`adoption document connected to ${fullName(child)}`, `An adoption document connected to ${fullName(child)} and their family situation at Ravenwood.`, `${item.relationship.id}-adoption`, ["library", "grand-hall"]);
    }
  }
  for (const npc of npcs.filter((candidate) => /media|story|scandal|journalist|local history/i.test(`${candidate.reasonOfStay} ${candidate.occupation}`)).slice(0, 2)) {
    add(`press clipping about ${fullName(npc)}`, `A press clipping about ${fullName(npc)}.`, `${npc.id}-press-clipping`, ["library", "grand-hall"]);
  }
  for (const npc of adults.filter((candidate) => candidate.sex === "Female" && candidate.age <= 50 && /dating|engaged|relationship|married/i.test(candidate.familyStatus)).slice(0, 1)) {
    add(`used pregnancy test hidden in ${fullName(npc)}'s bag`, `A used pregnancy test hidden in ${fullName(npc)}'s bag.`, `${npc.id}-pregnancy-test`, ["guest-room-1", "guest-room-2"], npc.id);
  }
  for (const npc of adults.slice(0, 2)) {
    add(`birthday card containing money for ${fullName(npc)}`, `A birthday card containing money addressed to ${fullName(npc)}.`, `${npc.id}-birthday-card`, ["drawing-room", "grand-hall"]);
    add(`diary key belonging to ${fullName(npc)}`, `A tiny diary key belonging to ${fullName(npc)}.`, `${npc.id}-diary-key`, ["library", "west-gallery"], stableHash(`${npc.id}-diary-key-held`) % 100 < 40 ? npc.id : undefined);
    add(`lock of hair tied with ribbon connected to ${fullName(npc)}`, `A lock of hair tied with ribbon connected to ${fullName(npc)}.`, `${npc.id}-hair-lock`, ["guest-room-1", "guest-room-2", "library"]);
    add(`foreign currency in ${fullName(npc)}'s pocket`, `Foreign currency connected to ${fullName(npc)}'s travel or private plans.`, `${npc.id}-currency`, ["grand-hall", "dining-room"], stableHash(`${npc.id}-currency-held`) % 100 < 45 ? npc.id : undefined);
    add(`photograph of ${fullName(npc)} with one person scratched out`, `A photograph of ${fullName(npc)} with one person scratched out.`, `${npc.id}-scratched-photo`, ["library", "drawing-room"]);
  }
  for (const npc of adults.filter((candidate) => /secret|blackmail|journalist|author|police|security/i.test(`${candidate.secret} ${candidate.occupation}`)).slice(0, 1)) {
    add(`handwritten list of guests' secrets held by ${fullName(npc)}`, `A handwritten list of guests' secrets held by ${fullName(npc)}. It is hard to steal and dangerous to show too early.`, `${npc.id}-secret-list`, ["library", "smoking-room"], npc.id);
  }
  add("lipstick-stained coffee cup", "A lipstick-stained coffee cup, useful for asking who was drinking here.", "neutral-lipstick-cup", ["drawing-room", "dining-room"]);
  add("crumpled sweet wrapper", "A crumpled sweet wrapper from hotel sweets.", "neutral-sweet-wrapper", ["grand-hall", "garden-terrace"]);
  add("paperback romance novel", "A paperback romance novel with a cracked spine.", "neutral-romance-novel", ["library", "drawing-room"]);

  const targetCount = clamp(8 + Math.floor(npcs.length / 4), 10, 18);
  const sorted = findables
    .sort((left, right) => stableHash(`${left.name}-neutral-order`) - stableHash(`${right.name}-neutral-order`));
  const directItemNames = new Set([
    "lantern",
    "gloves",
    "hotel stationery and envelopes",
    "fountain pen",
    "silver-plated teaspoon",
    "sewing kit from the hotel",
    "comb",
    "folded newspaper",
    "cheap plastic lighter",
    "polaroid photo machine",
    "cassette tape without a label",
    "spare camera battery",
    "disposable camera",
    "telephone calling card",
    "shoe-polishing cloth",
    "diary key",
    "handgun",
    "kitchen knife wrapped in cloth",
    "latex gloves",
    "empty sleeping-pill packet",
    "torn strip of fabric",
    "coil of electrical wire",
    "heavy brass candlestick",
    "bottle labelled poison containing cleaning fluid",
    "hunting catalogue",
    "shovel with fresh soil on it",
    "damp towel smelling of chemicals",
    "blackmail-style note written as a joke",
    "map with several rooms circled",
    "cassette containing a recorded argument",
    "anonymous threatening letter from years ago",
    "fishing line",
    "broken champagne glass",
    "spare master key",
    "bottle of rat poison",
    "newspaper article about an unsolved murder",
    "anonymous hotel complaint",
    "lipstick-stained coffee cup",
    "crumpled sweet wrapper",
    "paperback romance novel"
  ]);
  const directItems = sorted.filter((item) => directItemNames.has(item.name));
  const contextualItems = sorted.filter((item) => !directItemNames.has(item.name));
  const selected = [...directItems.slice(0, 6), ...contextualItems.slice(0, Math.max(4, targetCount - 6))];
  for (const item of sorted) {
    if (selected.length >= targetCount) break;
    if (!selected.includes(item)) selected.push(item);
  }
  return selected.slice(0, targetCount);
}

function mysteryWitnessFindableForMurder(murder: MysteryMurder, index: number, npcs: MysteryNpc[], rooms: MysteryRoom[]): MysteryFindable | null {
  const witness = murder.witnessId ? npcs.find((npc) => npc.id === murder.witnessId) : undefined;
  const victim = npcs.find((npc) => npc.id === murder.victimId);
  if (!witness || !victim) return null;
  const room = rooms.find((candidate) => candidate.id === witness.roomId || candidate.id === witness.stationRoomId) ??
    rooms.find((candidate) => candidate.accessible);
  const statement = cleanSentenceEnd(murder.witnessSummary ?? `${fullName(witness)} noticed something important shortly after ${fullName(victim)} died`);
  return {
    id: uid(),
    kind: "Proof",
    origin: "Crime",
    name: `Witness note from ${fullName(witness)}`,
    description: `${statement}.`,
    playerName: `Witness note from ${fullName(witness)}`,
    playerDescription: `${statement}.`,
    roomId: room?.id ?? "grand-hall",
    availableDay: murder.day,
    availableDaytime: murder.daytime,
    relatedMurderIndex: index,
    clueRole: "Witness",
    proofText: `${statement}.`,
    searchDifficulty: "medium"
  };
}

function mysteryFalseLeadFindableForMurder(murder: MysteryMurder, index: number, npcs: MysteryNpc[], rooms: MysteryRoom[]): MysteryFindable | null {
  const victim = npcs.find((npc) => npc.id === murder.victimId);
  const innocentPool = npcs
    .filter((npc) => npc.alive !== false && npc.id !== murder.killerId && npc.id !== murder.victimId && npc.age >= 14)
    .sort((a, b) => stableHash(`${murder.victimId}-${a.id}-false-lead`) - stableHash(`${murder.victimId}-${b.id}-false-lead`));
  const suspect = innocentPool[0];
  if (!suspect) return null;
  const room = rooms.find((candidate) => candidate.id === suspect.roomId || candidate.id === suspect.stationRoomId) ??
    rooms.find((candidate) => candidate.accessible);
  const item = pick([
    `nervous apology note from ${fullName(suspect)}`,
    `stained handkerchief with ${mysteryNpcInitials(suspect)} on it`,
    `folded receipt from ${fullName(suspect)}'s pocket`,
    `broken cufflink marked with ${mysteryNpcInitials(suspect)}`,
    `private letter hidden by ${fullName(suspect)}`
  ]);
  return {
    id: uid(),
    kind: "Snatchable",
    origin: "Drama",
    name: item,
    description: `${mysterySentenceCaseText(item)} makes ${fullName(suspect)} look nervous${victim ? ` after ${fullName(victim)}'s death` : ""}, but points to private trouble rather than a clean case.`,
    playerName: mysterySentenceCaseText(item),
    playerDescription: `It makes ${fullName(suspect)} look nervous for private reasons.`,
    roomId: room?.id ?? "grand-hall",
    availableDay: 1,
    availableDaytime: "Morning",
    clueRole: "FalseLead",
    falseLeadForMurderIndex: index,
    searchDifficulty: "easy"
  };
}

function mysteryFindablesForScenario(murders: MysteryMurder[], npcs: MysteryNpc[], rooms: MysteryRoom[], relationships: MysteryNpcRelationship[] = []): MysteryFindable[] {
  const roomName = (roomId: string) => rooms.find((room) => room.id === roomId)?.name ?? titleCase(roomId.replace(/-/g, " "));
  const findables: MysteryFindable[] = [];
  const frontDeskStaff = npcs.find((npc) => npc.role === "Staff" && ["Butler", "Housekeeper", "Head waiter", "Waiter", "Night porter"].includes(npc.occupation)) ?? npcs.find((npc) => npc.role === "Staff");
  findables.push({
    id: uid(),
    kind: "Snatchable",
    origin: "House",
    name: "master room key",
    description: `Opens every guest-room door in the mansion; can be stolen from the front desk${frontDeskStaff ? ` or from ${fullName(frontDeskStaff)}` : ""}.`,
    roomId: "grand-hall",
    holderNpcId: frontDeskStaff?.id,
    availableDay: 1,
    availableDaytime: "Morning"
  });
  findables.push({
    id: uid(),
    kind: "Snatchable",
    origin: "House",
    name: "grand hall service key",
    description: "Opens every staff and service area in the mansion; can be stolen from the Great Hall service desk.",
    roomId: "grand-hall",
    availableDay: 1,
    availableDaytime: "Morning"
  });

  const guestKeyRooms = new Set<string>();
  for (const npc of npcs.filter((candidate) => candidate.role === "Guest")) {
    if (guestKeyRooms.has(npc.roomId)) continue;
    guestKeyRooms.add(npc.roomId);
    const occupants = npcs.filter((candidate) => candidate.role === "Guest" && candidate.roomId === npc.roomId);
    const occupantNames = occupants.map(fullName).join(", ");
    findables.push({
      id: uid(),
      kind: "Snatchable",
      origin: "House",
      name: `${roomName(npc.roomId).toLowerCase()} key`,
      description: `Opens ${roomName(npc.roomId)}; can be snatched from ${occupantNames} or from staff assigned to clean or serve that room.`,
      holderNpcId: npc.id,
      availableDay: 1,
      availableDaytime: "Morning"
    });
  }

  murders.forEach((murder, index) => {
    const killer = npcs.find((npc) => npc.id === murder.killerId);
    const victim = npcs.find((npc) => npc.id === murder.victimId);
    if (!killer || !victim) return;
    const motiveProof = mysteryPreciseMotiveProof(murder.motive, killer, victim);
    const methodProof = mysteryPreciseMethodProof(murder.method, killer, victim, roomName(murder.roomId));
    findables.push(
      {
        id: uid(),
        kind: "Proof",
        origin: "Crime",
        name: motiveProof.name,
        description: motiveProof.description,
        roomId: killer.roomId,
        holderNpcId: killer.id,
        availableDay: 1,
        availableDaytime: "Morning",
        relatedMurderIndex: index,
        clueRole: "Motive",
        proofText: motiveProof.description,
        searchDifficulty: motiveProof.searchDifficulty
      },
      {
        id: uid(),
        kind: "Proof",
        origin: "Crime",
        name: methodProof.name,
        description: methodProof.description,
        roomId: murder.roomId,
        availableDay: murder.day,
        availableDaytime: murder.daytime,
        relatedMurderIndex: index,
        clueRole: "Method",
        proofText: methodProof.description,
        searchDifficulty: methodProof.searchDifficulty
      }
    );
    const witnessFindable = mysteryWitnessFindableForMurder(murder, index, npcs, rooms);
    if (witnessFindable) findables.push(witnessFindable);
    const falseLead = mysteryFalseLeadFindableForMurder(murder, index, npcs, rooms);
    if (falseLead) findables.push(falseLead);
  });
  const dramaCandidates = npcs
    .filter((npc) => npc.alive !== false && npc.age >= 16)
    .sort((a, b) => stableHash(`${a.id}-drama-order`) - stableHash(`${b.id}-drama-order`))
    .slice(0, clamp(Math.floor(npcs.length / 3), 4, 8));
  findables.push(...dramaCandidates.map((npc) => mysteryDramaFindableForNpc(npc, rooms)));
  findables.push(...mysteryNeutralHouseFindablesForScenario(npcs, rooms, relationships));
  if (roll(0.6)) {
    const commonCardRoom = rooms.find((room) => room.id === "smoking-room") ?? rooms.find((room) => ravenwoodCommonRooms.includes(room.id));
    if (commonCardRoom) {
      findables.push({
        id: uid(),
        kind: "Snatchable",
        origin: "House",
        name: "deck of cards",
        description: `A worn deck of cards left on a table in ${commonCardRoom.name}; can be picked up from the room once the house is sealed.`,
        roomId: commonCardRoom.id,
        availableDay: 1,
        availableDaytime: "Morning"
      });
    }
  }
  return findables.map(mysteryWithPlayerFacingFindableText);
}

function mysteryWitnessSummaryFor(killer: MysteryNpc, victim: MysteryNpc, witness: MysteryNpc, roomName: string, method: string, motive: string, proofHint?: string): string {
  const motiveDetail = cleanSentenceEnd(motive).replace(/^To\b/i, "to");
  const witnessProof = proofHint?.trim();
  if (witnessProof && /^Witness:/i.test(witnessProof)) {
    return cleanSentenceEnd(witnessProof)
      .replace(/^Witness:\s*/i, "")
      .replace(/,\s*but\s+[^.]*?\bwill only speak after trust is gained\./i, ".")
      .replace(/\s{2,}/g, " ")
      .trim();
  }
  const proofDetail = proofHint
    ? cleanSentenceEnd(proofHint.split("; can be found")[0].split(". Can be found")[0])
    : `evidence connected to ${fullName(victim)}'s death`;
  const variants = [
    `${fullName(witness)} saw ${fullName(killer)} flee from ${roomName} after the murder`,
    `${fullName(witness)} overheard ${fullName(killer)} say they needed ${motiveDetail} shortly before the murder`,
    `${fullName(witness)} saw ${fullName(killer)} tuck away ${proofDetail} shortly after ${fullName(victim)} died`,
    `${fullName(witness)} noticed ${fullName(killer)} changing clothes after the estimated time of the murder`,
    `${fullName(witness)} saw ${fullName(killer)} take the service route away from ${roomName}`
  ];
  const methodLower = method.toLowerCase();
  if (methodLower.includes("shot")) return `${fullName(witness)} heard the shot and saw ${fullName(killer)} leave ${roomName} before anyone else arrived`;
  if (methodLower.includes("staircase") || methodLower.includes("balcony") || methodLower.includes("window")) return `${fullName(witness)} saw ${fullName(killer)} near the fall point moments before ${fullName(victim)} died`;
  return variants[stableHash(`${killer.id}-${victim.id}-${witness.id}-witness`) % variants.length];
}

function mysteryWitnessAccessText(witness: MysteryNpc): string {
  return `${fullName(witness)} won't tell the player unless trust or romance is very high (above 75), or Charisma/Persuasion roll 6 succeeds, or Deception/Rizz roll 10 succeeds`;
}

function mysteryProofsFor(method: string, motive: string, killer: MysteryNpc, victim: MysteryNpc, npcs: MysteryNpc[], relationships: MysteryNpcRelationship[], availableDay: number, availableDaytime: Daytime, roomName = "the murder room"): { proofs: string[]; witnessId?: string; witnessSummary?: string } {
  const witnessPool = npcs.filter((npc) => npc.id !== killer.id && npc.id !== victim.id && npc.alive !== false);
  const witness = pick(witnessPool.length > 0 ? witnessPool : [killer]);
  const proofTemplates = [
    pick(mysteryWitnessClues),
    pick(mysteryMethodClues(method)),
    pick(mysteryMotiveClues(motive)),
    pick(mysteryExtraClues(method))
  ];
  const proofs = proofTemplates
    .map((proof) => fillMysteryTemplate(proof, killer, victim, npcs, witness))
    .filter((proof, index, list) => list.indexOf(proof) === index)
    .slice(0, 4);
  let witnessSummary: string | undefined;
  if (witness.id !== killer.id) {
    witnessSummary = mysteryWitnessSummaryFor(killer, victim, witness, roomName, method, motive, proofs[0]);
    addMysteryNpcRelationship(
      relationships,
      witness,
      killer,
      "Witness",
      `${witnessSummary}, but ${mysteryWitnessAccessText(witness)}.`,
      { hidden: true, trustImpact: 5, motiveRisk: 11, availableDay, availableDaytime }
    );
  }
  return { proofs, witnessId: witness.id !== killer.id ? witness.id : undefined, witnessSummary };
}

function cleanSentenceEnd(text: string): string {
  return text.trim().replace(/[.!?]+$/g, "");
}

function mysteryPairRelationship(relationships: MysteryNpcRelationship[], a: MysteryNpc, b: MysteryNpc): MysteryNpcRelationship | undefined {
  return relationships
    .filter((relationship) =>
      (relationship.fromId === a.id && relationship.toId === b.id) ||
      (relationship.fromId === b.id && relationship.toId === a.id)
    )
    .sort((left, right) => right.motiveRisk - left.motiveRisk)[0];
}

function mysteryMotiveFromRelationship(relationship: MysteryNpcRelationship, killer: MysteryNpc, victim: MysteryNpc): string {
  if (relationship.kind === "Debt") return `To stop ${fullName(victim)} from forcing payment on a debt ${fullName(killer)} could not repay`;
  if (relationship.kind === "Blackmail") return `To stop ${fullName(victim)} from using blackmail against ${fullName(killer)}`;
  if (relationship.kind === "Witness") return `To keep ${fullName(victim)} from revealing what they witnessed about ${fullName(killer)}`;
  if (relationship.kind === "Romance" || relationship.kind === "Affair") return `To keep a private relationship with ${fullName(victim)} from becoming public`;
  if (relationship.kind === "Rivalry") return `To end a bitter rivalry with ${fullName(victim)} before it ruined ${fullName(killer)}`;
  if (relationship.kind === "Family" || relationship.kind === "Marriage") return `To silence ${fullName(victim)} after a family argument turned dangerous`;
  return `To silence ${fullName(victim)} after they learned too much about ${fullName(killer)}`;
}

function mysteryEarlierMurderCoverupMotive(killer: MysteryNpc, victim: MysteryNpc, earlierVictimName: string, earlierMotive: string): string {
  const wasRelationshipCoverup = earlierMotive.toLowerCase().includes("relationship") || earlierMotive.toLowerCase().includes("dating") || earlierMotive.toLowerCase().includes("affair") || earlierMotive.toLowerCase().includes("engagement");
  return wasRelationshipCoverup
    ? `To silence ${fullName(victim)} after they found out that ${fullName(killer)} had killed ${earlierVictimName} to keep a relationship secret and threatened to tell the police`
    : `To silence ${fullName(victim)} after they found out that ${fullName(killer)} had killed ${earlierVictimName} and threatened to tell the police`;
}

function mysteryMotiveFor(killer: MysteryNpc, victim: MysteryNpc, npcs: MysteryNpc[], relationships: MysteryNpcRelationship[], availableDay: number, availableDaytime: Daytime, previousMurders: MysteryMurder[] = []): string {
  const earlierMurder = previousMurders
    .filter((murder) => murder.killerId === killer.id)
    .sort((left, right) => mysteryTimeSortValue(right.day, right.daytime) - mysteryTimeSortValue(left.day, left.daytime))[0];
  const directRelationship = mysteryPairRelationship(relationships, killer, victim);
  if (earlierMurder && (directRelationship || roll(0.85))) {
    const earlierVictim = npcs.find((npc) => npc.id === earlierMurder.victimId);
    const earlierVictimName = earlierVictim ? fullName(earlierVictim) : "the previous victim";
    const wasRelationshipCoverup = earlierMurder.motive.toLowerCase().includes("relationship") || earlierMurder.motive.toLowerCase().includes("dating") || earlierMurder.motive.toLowerCase().includes("affair") || earlierMurder.motive.toLowerCase().includes("engagement");
    killer.secret = `Killed ${earlierVictimName} and is hiding evidence of the earlier murder.`;
    victim.secret = `Found out that ${fullName(killer)} killed ${earlierVictimName} and planned to tell the police.`;
    addMysteryNpcRelationship(
      relationships,
      victim,
      killer,
      "Witness",
      `${fullName(victim)} found out that ${fullName(killer)} killed ${earlierVictimName}${wasRelationshipCoverup ? " to keep a relationship secret" : ""} and planned to give them up to the police.`,
      { hidden: true, trustImpact: -14, motiveRisk: 16, availableDay, availableDaytime }
    );
    return mysteryEarlierMurderCoverupMotive(killer, victim, earlierVictimName, earlierMurder.motive);
  }
  if (directRelationship && directRelationship.motiveRisk >= 7) return mysteryMotiveFromRelationship(directRelationship, killer, victim);

  if (killer.age < 18 || victim.age < 18) {
    const secret = killer.age < 18 ? pick(mysteryMinorMotiveTemplates) : "To stop {victim} revealing a dangerous family secret.";
    killer.secret = killer.age < 18
      ? pick(["Stole a key and hid it from their guardian.", "Was seen in a forbidden room.", "Hid evidence after overhearing the real plan."])
      : "Is hiding a dangerous family secret involving a younger guest.";
    addMysteryNpcRelationship(
      relationships,
      victim,
      killer,
      "Witness",
      `${fullName(victim)} knew that ${fullName(killer)} was hiding evidence of a previous murder.`,
      { hidden: true, trustImpact: -10, motiveRisk: 13, availableDay, availableDaytime }
    );
    return fillMysteryTemplate(secret, killer, victim, npcs);
  }

  const scenario = pick(["debt", "forgery", "inheritance", "blackmail", "work_theft", "relationship"]);
  if (scenario === "inheritance") {
    killer.secret = "Is hiding a forged inheritance document.";
    victim.secret = "Was preparing to challenge an inheritance arrangement.";
    if (killer.role === "Guest") killer.reasonOfStay = "Meeting a lawyer about an inheritance";
    if (victim.role === "Guest") victim.reasonOfStay = "Meeting a lawyer about an inheritance";
    addMysteryNpcRelationship(
      relationships,
      killer,
      victim,
      "Rivalry",
      `${fullName(killer)} and ${fullName(victim)} were privately disputing an inheritance tied to Ravenwood.`,
      { hidden: true, trustImpact: -14, motiveRisk: 15 }
    );
    return `To silence ${fullName(victim)} after a private argument about inheritance`;
  }

  if (scenario === "debt") {
    killer.secret = pick(["Is deeply in debt.", "Has unpaid gambling debts and has told no one.", "Has been borrowing money from friends and lying about why."]);
    addMysteryNpcRelationship(
      relationships,
      killer,
      victim,
      "Debt",
      `${fullName(killer)} owed ${fullName(victim)} money and feared the debt would be exposed.`,
      { hidden: true, trustImpact: -12, motiveRisk: 14 }
    );
    return `To stop ${fullName(victim)} from exposing ${fullName(killer)}'s debt`;
  }

  if (scenario === "forgery") {
    killer.secret = "Is hiding a forged second identity card that is linked to a number of crimes.";
    victim.secret = "Had noticed a forged signature in private papers.";
    addMysteryNpcRelationship(
      relationships,
      victim,
      killer,
      "Witness",
      `${fullName(victim)} had seen evidence that ${fullName(killer)} forged a second identity card and copied a signature in private papers.`,
      { hidden: true, trustImpact: -10, motiveRisk: 14, availableDay, availableDaytime }
    );
    return `To keep ${fullName(victim)} from proving that ${fullName(killer)} had forged a second identity card`;
  }

  if (scenario === "work_theft") {
    const theftTarget = pick(["cash from the service till", "guest tips from the staff ledger", "money from the locked pantry envelope"]);
    const staffTargets = npcs.filter((npc) => npc.role === "Staff" && npc.id !== killer.id && npc.id !== victim.id);
    const bribedStaff = staffTargets.length > 0 ? pick(staffTargets) : undefined;
    const bribe = pick(["cash", "an expensive watch", "forged references", "a promise of work at another hotel"]);
    const bribeTarget = bribedStaff ? fullName(bribedStaff) : "a servant";
    const isTheft = killer.role === "Staff";
    killer.secret = isTheft
      ? `Has been stealing ${theftTarget} at Ravenwood.`
      : `Has been bribing ${bribeTarget} with ${bribe}.`;
    victim.secret = isTheft
      ? `Knew that ${fullName(killer)} stole ${theftTarget}.`
      : `Knew that ${fullName(killer)} bribed ${bribeTarget} with ${bribe}.`;
    addMysteryNpcRelationship(
      relationships,
      victim,
      killer,
      "Witness",
      isTheft
        ? `${fullName(victim)} knew about ${fullName(killer)}'s theft at Ravenwood. ${fullName(killer)} stole ${theftTarget}.`
        : `${fullName(victim)} knew about ${fullName(killer)}'s bribery at Ravenwood. ${fullName(killer)} bribed ${bribeTarget} with ${bribe}.`,
      { hidden: true, trustImpact: -9, motiveRisk: 13, availableDay, availableDaytime }
    );
    return isTheft
      ? `To stop ${fullName(victim)} revealing that ${fullName(killer)} had stolen ${theftTarget}`
      : `To stop ${fullName(victim)} revealing that ${fullName(killer)} had bribed ${bribeTarget}`;
  }

  if (scenario === "relationship") {
    const partnerCandidates = npcs.filter((npc) =>
      npc.id !== killer.id &&
      npc.id !== victim.id &&
      npc.age >= 18 &&
      mysteryAllowsLargeAgeGapRomance(killer, npc)
    );
    if (partnerCandidates.length === 0) {
      killer.secret = "Is being blackmailed over an old lie.";
      victim.secret = `Had leverage over ${fullName(killer)}.`;
      addMysteryNpcRelationship(
        relationships,
        victim,
        killer,
        "Blackmail",
        `${fullName(victim)} had leverage over ${fullName(killer)} and threatened to use it.`,
        { hidden: true, trustImpact: -13, motiveRisk: 15 }
      );
      return `To stop ${fullName(victim)} from revealing a blackmail scheme`;
    }
    const partner = mysteryPickWeightedRomanticCandidate(killer, partnerCandidates) ?? pick(partnerCandidates);
    ensureSharedRavenwoodHistory(killer, partner);
    ensureSharedRavenwoodHistory(victim, killer);
    killer.familyStatus = "Secretly dating";
    partner.familyStatus = "Secretly dating";
    killer.secret = `Is secretly involved with ${fullName(partner)}.`;
    victim.secret = `Knew about ${fullName(killer)}'s private relationship with ${fullName(partner)}.`;
    addMysteryNpcRelationship(
      relationships,
      killer,
      partner,
      "Affair",
      `${fullName(killer)} and ${fullName(partner)} are romantically involved but keeping it private.`,
      { hidden: true, trustImpact: 6, motiveRisk: 8, skipGuards: true }
    );
    addMysteryNpcRelationship(
      relationships,
      victim,
      killer,
      "Witness",
      `${fullName(victim)} knew about ${fullName(killer)}'s private relationship with ${fullName(partner)}.`,
      { hidden: true, trustImpact: -9, motiveRisk: 13, availableDay, availableDaytime }
    );
    return `To prevent ${fullName(victim)} from exposing ${fullName(killer)}'s relationship with ${fullName(partner)}`;
  }

  killer.secret = "Is being blackmailed over an old lie.";
  victim.secret = `Had leverage over ${fullName(killer)}.`;
  addMysteryNpcRelationship(
    relationships,
    victim,
    killer,
    "Blackmail",
    `${fullName(victim)} had leverage over ${fullName(killer)} and threatened to use it.`,
    { hidden: true, trustImpact: -13, motiveRisk: 15 }
  );
  return `To stop ${fullName(victim)} from revealing a blackmail scheme`;
}

function repairMysteryMurderTimelineAndMotives(murders: MysteryMurder[], npcs: MysteryNpc[], relationships: MysteryNpcRelationship[]): string[] {
  const sanityLines: string[] = [];
  murders.sort((a, b) => mysteryTimeSortValue(a.day, a.daytime) - mysteryTimeSortValue(b.day, b.daytime));
  for (let index = 0; index < murders.length; index += 1) {
    const murder = murders[index];
    const killer = npcs.find((npc) => npc.id === murder.killerId);
    const victim = npcs.find((npc) => npc.id === murder.victimId);
    if (!killer || !victim) continue;
    const futureVictim = murders
      .slice(index + 1)
      .map((futureMurder) => npcs.find((npc) => npc.id === futureMurder.victimId))
      .find((futureNpc) => futureNpc && murder.motive.includes(fullName(futureNpc)));
    if (!futureVictim) continue;
    const earlierMurder = murders
      .slice(0, index)
      .filter((candidate) => candidate.killerId === murder.killerId)
      .sort((left, right) => mysteryTimeSortValue(right.day, right.daytime) - mysteryTimeSortValue(left.day, left.daytime))[0];
    const earlierVictim = earlierMurder ? npcs.find((npc) => npc.id === earlierMurder.victimId) : undefined;
    if (earlierMurder && earlierVictim) {
      murder.motive = mysteryEarlierMurderCoverupMotive(killer, victim, fullName(earlierVictim), earlierMurder.motive);
      addMysteryNpcRelationship(
        relationships,
        victim,
        killer,
        "Witness",
        `${fullName(victim)} found out that ${fullName(killer)} killed ${fullName(earlierVictim)} and planned to tell the police.`,
        { hidden: true, trustImpact: -14, motiveRisk: 16, availableDay: murder.day, availableDaytime: murder.daytime }
      );
      sanityLines.push(`Scenario repair: ${fullName(victim)}'s motive no longer references future victim ${fullName(futureVictim)}; it now references earlier victim ${fullName(earlierVictim)}.`);
    } else {
      murder.motive = `To silence ${fullName(victim)} after they discovered a dangerous secret about ${fullName(killer)} and threatened to tell the police`;
      sanityLines.push(`Scenario repair: ${fullName(victim)}'s motive no longer references future victim ${fullName(futureVictim)}.`);
    }
  }
  return sanityLines;
}

function uniqueRavenwoodFirstName(
  sex: Sex,
  familyName: string,
  usedNames: Set<string>,
  usedFirstNames: Set<string>,
  preferred?: string
): string {
  const bank = Array.from(new Set((sex === "Male" ? ravenwoodMaleNames : ravenwoodFemaleNames).map(cleanRavenwoodNameText)));
  const cleanFamilyName = cleanRavenwoodNameText(familyName);
  const cleanPreferred = preferred ? cleanRavenwoodNameText(preferred) : "";

  if (cleanPreferred && bank.includes(cleanPreferred)) {
    const preferredFirstNameKey = cleanPreferred.toLowerCase();
    const preferredFullNameKey = `${cleanPreferred} ${cleanFamilyName}`.toLowerCase();

    if (
      !usedFirstNames.has(preferredFirstNameKey) &&
      !usedNames.has(preferredFullNameKey)
    ) {
      usedFirstNames.add(preferredFirstNameKey);
      usedNames.add(preferredFullNameKey);
      return cleanPreferred;
    }
  }

  const availableNames = shuffled(bank).filter((name) => {
    const firstNameKey = name.toLowerCase();
    const fullNameKey = `${name} ${cleanFamilyName}`.toLowerCase();

    return (
      !usedFirstNames.has(firstNameKey) &&
      !usedNames.has(fullNameKey)
    );
  });

  if (availableNames.length > 0) {
    const selectedName = availableNames[0];

    usedFirstNames.add(selectedName.toLowerCase());
    usedNames.add(`${selectedName} ${cleanFamilyName}`.toLowerCase());

    return selectedName;
  }

  const fallbackBaseName = pick(bank);
  let suffix = 2;
  let fallback = `${fallbackBaseName} ${suffix}`;

  while (
    usedFirstNames.has(fallback.toLowerCase()) ||
    usedNames.has(`${fallback} ${cleanFamilyName}`.toLowerCase())
  ) {
    suffix += 1;
    fallback = `${fallbackBaseName} ${suffix}`;
  }

  usedFirstNames.add(fallback.toLowerCase());
  usedNames.add(`${fallback} ${cleanFamilyName}`.toLowerCase());

  return fallback;
}

function ravenwoodFamilyName(preferred?: string, blockedFamilyNames = new Set<string>()): string {
  const bank = Array.from(new Set(ravenwoodSurnames.map(cleanRavenwoodNameText)));
  const cleanPreferred = preferred ? cleanRavenwoodNameText(preferred) : "";
  if (cleanPreferred && bank.includes(cleanPreferred) && !blockedFamilyNames.has(cleanPreferred.toLowerCase())) return cleanPreferred;
  const available = bank.filter((name) => !blockedFamilyNames.has(name.toLowerCase()));
  return pick(available.length > 0 ? available : bank);
}

function mysteryFamilyStatusFor(age: number, role: MysteryNpc["role"]): string {
  if (age < 14) return "Child";
  if (age < 18) return "Single";
  if (role === "Guest" && age < 24) return pick(["Single", "Single", "Engaged", "Secretly dating", "Unsure", "Open to explore"]);
  if (age < 40) {
    const youngAdultStatuses = role === "Staff"
      ? ["Single", "Single", "Married", "Divorced", "In a relationship"]
      : mysteryFamilyStatuses.filter((status) => status !== "Widowed");
    return roll(age < 30 ? 0.01 : 0.03) ? "Widowed" : pick(youngAdultStatuses);
  }
  if (role === "Staff") return pick(["Single", "Married", "Widowed", "Divorced", "In a relationship"]);
  return pick(mysteryFamilyStatuses);
}

function mysteryReplacementForYoungWidowedStatus(npc: MysteryNpc): string {
  const options = npc.role === "Staff"
    ? ["Single", "Married", "Divorced", "In a relationship"]
    : ["Single", "Divorced", "In a relationship", "Secretly dating", "On a break from a relationship", "Unsure"];
  return options[stableHash(`${npc.id}-${npc.firstName}-${npc.familyName}-young-widowed-repair`) % options.length];
}

function mysteryKeepsRareYoungWidowedStatus(npc: MysteryNpc): boolean {
  const chance = npc.age < 30 ? 1 : 3;
  return stableHash(`${npc.id}-${npc.firstName}-${npc.familyName}-young-widowed-keep`) % 100 < chance;
}

function mysterySecretFor(age: number): string {
  if (age < 14) return pick(mysteryChildSecrets);
  if (age < 18) return pick(mysteryTeenSecrets);
  if (roll(0.28)) return pick(mysteryHarmlessSecrets);
  if (roll(0.24)) return pick(mysteryInnocentSuspiciousSecrets);
  return pick(mysterySecrets);
}

function mysteryResolveNpcSecretPlaceholders(secret: string, npc: MysteryNpc, npcs: MysteryNpc[]): string {
  let linkedIndex = 0;
  const linkedCandidates = npcs.filter((candidate) => candidate.id !== npc.id);
  return secret.replace(/\{linked_character\}/g, () => {
    const linked = linkedCandidates.length > 0
      ? linkedCandidates[stableHash(`${npc.id}-${secret}-linked-${linkedIndex}`) % linkedCandidates.length]
      : undefined;
    linkedIndex += 1;
    return linked ? fullName(linked) : "another resident";
  });
}

function mysterySubstancePreferenceFor(age: number, role: MysteryNpc["role"]): MysteryNpc["substancePreference"] {
  if (age < 16) return "none";
  if (role === "Staff") return pick(["none", "none", "cigarettes", "alcohol", "alcohol and cigarettes"]);
  return pick(["none", "alcohol", "alcohol", "cigarettes", "weed", "alcohol and cigarettes", "alcohol and weed"]);
}

function mysteryDisplaySubstancePreference(npc: MysteryNpc): MysteryNpc["substancePreference"] {
  return npc.substancePreference;
}

function mysteryStayNightsRangeForReason(reasonOfStay?: string): { min: number; max: number } {
  const reason = mysteryReasonBase(reasonOfStay ?? "").toLowerCase();
  if (reason.includes("weekend break")) return { min: 2, max: 3 };
  if (reason.includes("summer vacation")) return { min: 5, max: 12 };
  if (reason.includes("honeymoon")) return { min: 4, max: 10 };
  if (reason.includes("romantic getaway")) return { min: 2, max: 5 };
  if (reason.includes("business partner") || reason.includes("work conference") || reason.includes("lawyer")) return { min: 1, max: 4 };
  if (reason.includes("wedding") || reason.includes("engagement party") || reason.includes("memorial") || reason.includes("funeral")) return { min: 2, max: 5 };
  if (reason.includes("family reunion") || reason.includes("visiting a relative")) return { min: 4, max: 8 };
  if (reason.includes("anniversary")) return { min: 2, max: 4 };
  if (reason.includes("old friend")) return { min: 2, max: 6 };
  if (reason.includes("recovering after an illness")) return { min: 7, max: 14 };
  if (reason.includes("missing person") || reason.includes("family history") || reason.includes("local story")) return { min: 4, max: 10 };
  if (reason.includes("reviewing the hotel")) return { min: 1, max: 3 };
  return { min: 3, max: 7 };
}

function mysteryGuestCurrentStay(plannedNights: number): string {
  const maxElapsedDays = Math.max(0, Math.min(4, plannedNights - 1));
  const days = rand(0, maxElapsedDays);
  if (days === 0) return "Arrived today.";
  if (days === 1) return "Has been staying at Ravenwood for 1 day.";
  return `Has been staying at Ravenwood for ${days} days.`;
}

function mysteryCurrentStayDays(npc: Pick<MysteryNpc, "currentStay">): number {
  if (/arrived today/i.test(npc.currentStay)) return 0;
  const dayMatch = npc.currentStay.match(/(\d+)\s+day/i);
  if (dayMatch) return Number(dayMatch[1]);
  const monthMatch = npc.currentStay.match(/(\d+)\s+month/i);
  if (monthMatch) return Number(monthMatch[1]) * 30;
  const yearMatch = npc.currentStay.match(/(\d+)\s+year/i);
  if (yearMatch) return Number(yearMatch[1]) * 365;
  return 0;
}

function mysteryHasPriorRavenwoodHistory(npc: MysteryNpc): boolean {
  if (npc.role === "Staff") return true;
  return Boolean(npc.previousStay && !/first stay/i.test(npc.previousStay));
}

function mysteryHasExtendedRavenwoodOpportunity(npc: MysteryNpc): boolean {
  return mysteryHasPriorRavenwoodHistory(npc) || mysteryCurrentStayDays(npc) >= 2;
}

function mysteryGuestPlannedStay(currentStay: string, reasonOfStay?: string): string {
  const stayedMatch = currentStay.match(/(\d+) day/);
  const alreadyStayed = currentStay.includes("Arrived today") ? 0 : Number(stayedMatch?.[1] ?? 1);
  const range = mysteryStayNightsRangeForReason(reasonOfStay);
  const plannedNights = clamp(rand(range.min, range.max), Math.max(range.min, alreadyStayed + 1), range.max);
  return `Planned stay: ${plannedNights} nights.`;
}

function mysteryGuestPreviousStay(age: number, reasonOfStay?: string): string {
  const hasReasonForPriorVisit = Boolean(reasonOfStay?.match(/old friend|relative|family history|inheritance|local story/i));
  const visitedBefore = hasReasonForPriorVisit || roll(age < 18 ? 0.28 : 0.42);
  if (!visitedBefore) return "First stay at Ravenwood.";
  const visitCount = rand(1, 5);
  return `Visited Ravenwood ${visitCount === 1 ? "once" : `${visitCount} times`} before, most recently ${pick(["last winter", "last spring", "last summer", "two years ago", "several years ago"])}.`;
}

function mysteryStaffCurrentStay(age: number): string {
  const maxYears = Math.max(1, age - RAVENWOOD_MIN_STAFF_AGE);
  const years = rand(0, Math.min(18, maxYears));
  if (years <= 0) {
    const months = rand(2, 11);
    return `Has worked at Ravenwood for ${months} months.`;
  }
  return `Has worked at Ravenwood for ${years} ${years === 1 ? "year" : "years"}.`;
}

function mysteryStayHistoryFor(role: MysteryNpc["role"], age: number, reasonOfStay?: string) {
  if (role === "Staff") {
    return {
      currentStay: mysteryStaffCurrentStay(age),
      plannedStay: "Staff residence: ongoing.",
      previousStay: "Lives or works at Ravenwood."
    };
  }
  const range = mysteryStayNightsRangeForReason(reasonOfStay);
  const plannedNights = rand(range.min, range.max);
  const currentStay = mysteryGuestCurrentStay(plannedNights);
  return {
    currentStay,
    plannedStay: `Planned stay: ${plannedNights} nights.`,
    previousStay: mysteryGuestPreviousStay(age, reasonOfStay)
  };
}

function ensurePriorRavenwoodHistory(npc: MysteryNpc) {
  const previousStay = npc.previousStay ?? "";
  const currentStay = npc.currentStay ?? "";
  if (npc.role === "Guest" && (!previousStay || previousStay.includes("First stay"))) {
    npc.previousStay = `Visited Ravenwood before, most recently ${pick(["last winter", "last spring", "last summer", "two years ago", "several years ago"])}.`;
  }
  if (npc.role === "Staff" && (!currentStay || currentStay.includes("months"))) {
    npc.currentStay = `Has worked at Ravenwood for ${rand(2, 9)} years.`;
  }
}

function ensureSharedRavenwoodHistory(a: MysteryNpc, b: MysteryNpc) {
  ensurePriorRavenwoodHistory(a);
  ensurePriorRavenwoodHistory(b);
}

function mysteryChildGuardianRelation(childSex: Sex, childAge: number, guardian: MysteryNpc): { childRelation: string; guardianRelation: string; reasonRole: string } {
  const ageGap = guardian.age - childAge;
  const parentRole = guardian.sex === "Female" ? "mother" : "father";
  const olderSiblingRole = guardian.sex === "Female" ? "older sister" : "older brother";
  const auntUncleRole = guardian.sex === "Female" ? "aunt" : "uncle";
  const childRole = childSex === "Female" ? "daughter" : "son";
  const niblingRole = childSex === "Female" ? "niece" : "nephew";
  const youngerSiblingRole = childSex === "Female" ? "younger sister" : "younger brother";

  if (ageGap >= 22 && roll(0.68)) {
    return { childRelation: `${childRole} of`, guardianRelation: `${parentRole} of`, reasonRole: parentRole };
  }
  if (ageGap <= 15 && roll(0.32)) {
    return { childRelation: `${youngerSiblingRole} of`, guardianRelation: `${olderSiblingRole} of`, reasonRole: olderSiblingRole };
  }
  if (roll(0.55)) {
    return { childRelation: `${niblingRole} of`, guardianRelation: `${auntUncleRole} of`, reasonRole: auntUncleRole };
  }
  return { childRelation: `${niblingRole} of`, guardianRelation: `${auntUncleRole} of`, reasonRole: auntUncleRole };
}

function mysteryBalancedSexPlan(total: number, playerSex?: Sex): Sex[] {
  if (total <= 0) return [];
  const nearEven = roll(0.5);
  const femaleLeansMajority = roll(0.5);
  const ratioAllowed = (femaleCount: number, maleCount: number) => {
    const count = femaleCount + maleCount;
    return count <= 0 || Math.max(femaleCount, maleCount) / count <= 0.6;
  };
  const candidates = Array.from({ length: total + 1 }, (_, femaleCount) => {
    const maleCount = total - femaleCount;
    const playerFemaleCount = playerSex === "Female" ? 1 : 0;
    const playerMaleCount = playerSex === "Male" ? 1 : 0;
    return {
      femaleCount,
      maleCount,
      gap: Math.abs(femaleCount - maleCount),
      allowed: ratioAllowed(femaleCount, maleCount) && ratioAllowed(femaleCount + playerFemaleCount, maleCount + playerMaleCount)
    };
  }).filter((candidate) => candidate.allowed);
  const safestCandidates = candidates.length > 0 ? candidates : [{ femaleCount: Math.ceil(total / 2), maleCount: Math.floor(total / 2), gap: total % 2, allowed: true }];
  const targetGap = nearEven ? Math.min(...safestCandidates.map((candidate) => candidate.gap)) : Math.max(...safestCandidates.map((candidate) => candidate.gap));
  const preferred = safestCandidates.filter((candidate) =>
    candidate.gap === targetGap &&
    (candidate.femaleCount === candidate.maleCount || (femaleLeansMajority ? candidate.femaleCount >= candidate.maleCount : candidate.maleCount >= candidate.femaleCount))
  );
  const chosen = pick(preferred.length > 0 ? preferred : safestCandidates.filter((candidate) => candidate.gap === targetGap));
  return shuffled([
    ...Array.from({ length: chosen.femaleCount }, () => "Female" as Sex),
    ...Array.from({ length: chosen.maleCount }, () => "Male" as Sex)
  ]);
}

function mysteryEducationFor(age: number, role: MysteryNpc["role"]): string {
  if (age < 14) return pick(["Primary school certificate", "Home-schooled", "No formal education"]);
  if (age < 18) return role === "Guest" ? pick(["Secondary school certificate", "Home-schooled", "Drama school training"]) : pick(["Secondary school certificate", "Food hygiene training", "No formal education", "Completed compulsory schooling"]);
  if (role === "Staff") return pick(["No formal education", "Completed compulsory schooling", "Food hygiene training", "Customer service training", "First aid training", "Security guard training", "Trade apprenticeship"]);
  return pick(mysteryEducations);
}

function mysteryStaffOccupationsForSex(sex?: Sex): string[] {
  return sex === "Male" ? mysteryStaffOccupations : mysteryStaffOccupations.filter((occupation) => occupation !== "Poolboy");
}

function mysteryOccupationFor(age: number, role: MysteryNpc["role"], sex?: Sex): string {
  if (age < 14) return role === "Guest" ? "None" : pick(["Kitchen helper", "Laundry helper"]);
  if (age < 18) return role === "Guest" ? pick(["Student", "Young heir", "Junior clerk"]) : pick(["Kitchen helper", "Laundry helper"]);
  return role === "Guest" ? pick(mysteryGuestOccupations.filter((occupation) => occupation !== "None")) : pick(mysteryStaffOccupationsForSex(sex));
}

function mysteryProfileFor(age: number, role: MysteryNpc["role"], sex?: Sex): { education: string; occupation: string } {
  if (age < 14) {
    return {
      education: pick(["Primary school certificate", "Home-schooled", "No formal education"]),
      occupation: role === "Guest" ? "None" : pick(["Kitchen helper", "Laundry helper"])
    };
  }
  if (age < 18) {
    return role === "Guest"
      ? {
        education: pick(["Secondary school certificate", "Home-schooled", "Drama school training"]),
        occupation: pick(["Student", "Young heir", "Junior clerk"])
      }
      : {
        education: pick(["Secondary school certificate", "Food hygiene training", "No formal education", "Completed compulsory schooling"]),
        occupation: pick(["Kitchen helper", "Laundry helper"])
      };
  }
  if (role === "Staff") {
    const occupation = pick(mysteryStaffOccupationsForSex(sex));
    const educationByStaffJob: Record<string, string[]> = {
      Butler: ["Customer service training", "Office administration training", "Completed compulsory schooling"],
      Cleaner: ["No formal education", "Food hygiene training", "Completed compulsory schooling"],
      Cook: ["Food hygiene training", "Trade apprenticeship", "Completed compulsory schooling"],
      Gardener: ["Trade apprenticeship", "Completed compulsory schooling"],
      "Head waiter": ["Customer service training", "Food hygiene training", "Completed compulsory schooling"],
      Housekeeper: ["Customer service training", "Office administration training", "Completed compulsory schooling"],
      "Kitchen porter": ["Food hygiene training", "No formal education", "Completed compulsory schooling"],
      "Laundry worker": ["No formal education", "Completed compulsory schooling", "Trade apprenticeship"],
      "Night porter": ["Security guard training", "Customer service training", "Completed compulsory schooling"],
      Nurse: ["First aid training", "Medical secretary training", "Completed compulsory schooling"],
      "Security guard": ["Security guard training", "First aid training", "Completed compulsory schooling"],
      Waiter: ["Customer service training", "Food hygiene training", "Completed compulsory schooling"],
      Chauffeur: ["First aid training", "Security guard training", "Completed compulsory schooling"],
      "Estate cleaner": ["No formal education", "Food hygiene training", "Completed compulsory schooling"],
      "Kitchen helper": ["Food hygiene training", "Completed compulsory schooling"],
      "Laundry helper": ["No formal education", "Completed compulsory schooling", "Trade apprenticeship"],
      Poolboy: ["Customer service training", "First aid training", "Completed compulsory schooling"]
    };
    return { occupation, education: pick(educationByStaffJob[occupation] ?? ["Trade apprenticeship", "Completed compulsory schooling"]) };
  }
  const availableProfiles = mysteryGuestCareerProfiles.filter((profile) => age >= profile.minAge);
  const profile = pick(availableProfiles.length > 0 ? availableProfiles : mysteryGuestCareerProfiles.slice(0, 8));
  return { occupation: profile.occupation, education: pick(profile.educations) };
}

function ravenwoodPortraitAge(age: number): number {
  if (age < 14) return 10;
  if (age < 21) return 16;
  if (age < 28) return 24;
  if (age < 45) return 30;
  return 50;
}

function ravenwoodStaffPortraitAge(age: number): number {
  if (age < 24) return 16;
  if (age < 30) return 24;
  if (age < 50) return 30;
  return 50;
}

function ravenwoodPortraitSignature(asset: RavenwoodGuestPortraitAsset): string {
  return `${asset.sourceKind}:${asset.lineage}`;
}

function markRavenwoodPortraitUsed(asset: RavenwoodGuestPortraitAsset | null | undefined, usedPortraitKeys: Set<string>, usedPortraitSignatures?: Set<string>) {
  if (!asset) return;
  usedPortraitKeys.add(asset.key);
  usedPortraitSignatures?.add(ravenwoodPortraitSignature(asset));
}

function chooseRavenwoodGuestPortrait(input: { sex: Sex; age: number; usedPortraitKeys: Set<string>; usedPortraitSignatures?: Set<string>; visualRace?: MysteryVisualRace; lineage?: string }): RavenwoodGuestPortraitAsset | null {
  const targetAge = ravenwoodPortraitAge(input.age);
  const unused = (asset: RavenwoodGuestPortraitAsset) => !input.usedPortraitKeys.has(asset.key) && !input.usedPortraitSignatures?.has(ravenwoodPortraitSignature(asset));
  const base = ravenwoodGuestPortraitAssets.filter((asset) => asset.sex === input.sex && asset.age === targetAge && unused(asset));
  const lineageMatches = input.lineage && !input.usedPortraitSignatures?.has(`guest:${input.lineage}`) ? base.filter((asset) => asset.lineage === input.lineage) : [];
  const raceMatches = input.visualRace ? base.filter((asset) => asset.visualRace === input.visualRace) : [];
  const candidates = lineageMatches.length > 0 ? lineageMatches : raceMatches.length > 0 ? raceMatches : base;
  const fallback = candidates.length > 0 ? candidates : ravenwoodGuestPortraitAssets.filter((asset) => asset.sex === input.sex && unused(asset));
  const portrait = fallback.length > 0 ? pick(fallback) : null;
  markRavenwoodPortraitUsed(portrait, input.usedPortraitKeys, input.usedPortraitSignatures);
  return portrait;
}

function chooseRavenwoodStaffPortrait(input: { sex: Sex; age: number; usedPortraitKeys: Set<string>; usedPortraitSignatures?: Set<string>; visualRace?: MysteryVisualRace; lineage?: string }): RavenwoodGuestPortraitAsset | null {
  const targetAge = ravenwoodStaffPortraitAge(input.age);
  const unused = (asset: RavenwoodGuestPortraitAsset) => !input.usedPortraitKeys.has(asset.key) && !input.usedPortraitSignatures?.has(ravenwoodPortraitSignature(asset));
  const base = ravenwoodStaffPortraitAssets.filter((asset) => asset.sex === input.sex && asset.age === targetAge && unused(asset));
  const lineageMatches = input.lineage && !input.usedPortraitSignatures?.has(`staff:${input.lineage}`) ? base.filter((asset) => asset.lineage === input.lineage) : [];
  const raceMatches = input.visualRace ? base.filter((asset) => asset.visualRace === input.visualRace) : [];
  const candidates = lineageMatches.length > 0 ? lineageMatches : raceMatches.length > 0 ? raceMatches : base;
  const fallback = candidates.length > 0 ? candidates : ravenwoodStaffPortraitAssets.filter((asset) => asset.sex === input.sex && unused(asset));
  const portrait = fallback.length > 0 ? pick(fallback) : null;
  markRavenwoodPortraitUsed(portrait, input.usedPortraitKeys, input.usedPortraitSignatures);
  return portrait;
}

function chooseRavenwoodPlayerPortrait(input: { sex: Sex; age: number; usedPortraitKeys: Set<string>; usedPortraitSignatures?: Set<string>; visualRace?: MysteryVisualRace }): RavenwoodGuestPortraitAsset | null {
  const targetAge = ravenwoodPortraitAge(input.age);
  const unused = (asset: RavenwoodGuestPortraitAsset) => !input.usedPortraitKeys.has(asset.key) && !input.usedPortraitSignatures?.has(ravenwoodPortraitSignature(asset));
  const base = ravenwoodPlayerPortraitAssets.filter((asset) => asset.sex === input.sex && asset.age === targetAge && unused(asset));
  const raceMatches = input.visualRace ? base.filter((asset) => asset.visualRace === input.visualRace) : [];
  const candidates = raceMatches.length > 0 ? raceMatches : base;
  const fallback = candidates.length > 0 ? candidates : ravenwoodPlayerPortraitAssets.filter((asset) => asset.sex === input.sex && unused(asset));
  const portrait = fallback.length > 0 ? pick(fallback) : null;
  markRavenwoodPortraitUsed(portrait, input.usedPortraitKeys, input.usedPortraitSignatures);
  return portrait;
}

function addMysteryFamilyNote(npc: MysteryNpc, note: string) {
  npc.familyRelationNote = npc.familyRelationNote ? `${npc.familyRelationNote}; ${note}` : note;
}

function emptyMysteryFamilyGraph(): MysteryFamilyGraph {
  return { links: [] };
}

function emptyMysteryFamilyStructure(): MysteryFamilyStructure {
  return { parentChild: [], siblings: [], spouses: [], partners: [], lovers: [], cousins: [], auntUncleNibling: [] };
}

function mysteryGraphPairKey(aId: string, bId: string): string {
  return [aId, bId].sort().join(":");
}

function addMysteryGraphPair(list: { aId: string; bId: string }[], aId: string, bId: string) {
  if (aId === bId || list.some((item) => mysteryGraphPairKey(item.aId, item.bId) === mysteryGraphPairKey(aId, bId))) return;
  list.push({ aId, bId });
}

function addMysteryGraphParent(graph: MysteryFamilyStructure, parentId: string, childId: string) {
  if (parentId === childId || graph.parentChild.some((item) => item.parentId === parentId && item.childId === childId)) return;
  graph.parentChild.push({ parentId, childId });
}

function addMysteryGraphAuntUncle(graph: MysteryFamilyStructure, auntUncleId: string, niblingId: string) {
  if (auntUncleId === niblingId || graph.auntUncleNibling.some((item) => item.auntUncleId === auntUncleId && item.niblingId === niblingId)) return;
  graph.auntUncleNibling.push({ auntUncleId, niblingId });
}

function mysterySiblingGroupsForGraph(graph: MysteryFamilyStructure): Set<string>[] {
  const groups: Set<string>[] = [];
  const groupFor = (id: string) => groups.find((group) => group.has(id));
  for (const pair of graph.siblings) {
    const left = groupFor(pair.aId);
    const right = groupFor(pair.bId);
    if (left && right && left !== right) {
      for (const id of right) left.add(id);
      groups.splice(groups.indexOf(right), 1);
    } else if (left) {
      left.add(pair.bId);
    } else if (right) {
      right.add(pair.aId);
    } else {
      groups.push(new Set([pair.aId, pair.bId]));
    }
  }
  return groups;
}

function mysterySiblingGroupMembers(graph: MysteryFamilyStructure, id: string): string[] {
  const group = mysterySiblingGroupsForGraph(graph).find((candidate) => candidate.has(id));
  return group ? Array.from(group) : [id];
}

function closeMysteryFamilyGraphCousinsAcrossSiblings(graph: MysteryFamilyStructure) {
  let changed = true;
  while (changed) {
    changed = false;
    for (const pair of [...graph.cousins]) {
      const leftGroup = mysterySiblingGroupMembers(graph, pair.aId);
      const rightGroup = mysterySiblingGroupMembers(graph, pair.bId);
      if (leftGroup.some((id) => rightGroup.includes(id))) continue;
      for (const leftId of leftGroup) {
        for (const rightId of rightGroup) {
          if (leftId === rightId || graph.siblings.some((sibling) => mysteryGraphPairKey(sibling.aId, sibling.bId) === mysteryGraphPairKey(leftId, rightId))) continue;
          const before = graph.cousins.length;
          addMysteryGraphPair(graph.cousins, leftId, rightId);
          changed = changed || graph.cousins.length > before;
        }
      }
    }
  }
}

function mysteryGraphHasPair(pairs: { aId: string; bId: string }[], aId: string, bId: string): boolean {
  return pairs.some((pair) => mysteryGraphPairKey(pair.aId, pair.bId) === mysteryGraphPairKey(aId, bId));
}

function mysteryGraphParentsOf(graph: MysteryFamilyStructure, childId: string): string[] {
  return graph.parentChild.filter((pair) => pair.childId === childId).map((pair) => pair.parentId);
}

function mysteryGraphChildrenOf(graph: MysteryFamilyStructure, parentId: string): string[] {
  return graph.parentChild.filter((pair) => pair.parentId === parentId).map((pair) => pair.childId);
}

function mysteryGraphDirectedParentKey(parentId: string, childId: string): string {
  return `${parentId}->${childId}`;
}

function mysteryNormalizeParentChildStructure(npcs: MysteryNpc[], graph: MysteryFamilyStructure): number {
  const byId = new Map(npcs.map((npc) => [npc.id, npc]));
  const parentsByChild = new Map<string, string[]>();
  for (const pair of graph.parentChild) {
    const parent = byId.get(pair.parentId);
    const child = byId.get(pair.childId);
    if (!parent || !child) continue;
    parentsByChild.set(pair.childId, [...(parentsByChild.get(pair.childId) ?? []), pair.parentId]);
  }
  const keptParentKeys = new Set<string>();
  const parentCandidateScore = (parentId: string, childId: string, allParentIds: string[]): number => {
    const parent = byId.get(parentId);
    const child = byId.get(childId);
    if (!parent || !child) return Number.NEGATIVE_INFINITY;
    const ageGap = parent.age - child.age;
    const linkedCoparentBonus = allParentIds.some((otherParentId) =>
      otherParentId !== parentId &&
      (
        mysteryGraphHasPair(graph.spouses, parentId, otherParentId) ||
        mysteryGraphHasPair(graph.partners, parentId, otherParentId)
      )
    ) ? 40 : 0;
    const sameFamilyBonus = parent.familyName === child.familyName ? 30 : 0;
    const ageFit = Math.max(0, 30 - Math.abs(ageGap - 30));
    return linkedCoparentBonus + sameFamilyBonus + ageFit - (stableHash(`${parentId}-${childId}-parent-choice`) % 100) / 1000;
  };
  for (const [childId, parentIds] of parentsByChild) {
    const uniqueParentIds = Array.from(new Set(parentIds));
    const keepBest = (candidates: string[]) => {
      const winner = candidates
        .filter((parentId) => byId.has(parentId))
        .sort((a, b) => parentCandidateScore(b, childId, uniqueParentIds) - parentCandidateScore(a, childId, uniqueParentIds))[0];
      if (winner) keptParentKeys.add(mysteryGraphDirectedParentKey(winner, childId));
    };
    keepBest(uniqueParentIds.filter((parentId) => byId.get(parentId)?.sex === "Female"));
    keepBest(uniqueParentIds.filter((parentId) => byId.get(parentId)?.sex === "Male"));
  }
  const before = graph.parentChild.length;
  graph.parentChild.splice(0, graph.parentChild.length, ...graph.parentChild.filter((pair) => keptParentKeys.has(mysteryGraphDirectedParentKey(pair.parentId, pair.childId))));
  return before - graph.parentChild.length;
}

function mysteryGraphAreSiblings(graph: MysteryFamilyStructure, aId: string, bId: string): boolean {
  if (mysteryGraphHasPair(graph.siblings, aId, bId)) return true;
  const aParents = mysteryGraphParentsOf(graph, aId);
  const bParents = mysteryGraphParentsOf(graph, bId);
  return aParents.some((parentId) => bParents.includes(parentId));
}

function mysteryGraphOtherIds(pairs: { aId: string; bId: string }[], id: string): string[] {
  return pairs
    .filter((pair) => pair.aId === id || pair.bId === id)
    .map((pair) => pair.aId === id ? pair.bId : pair.aId);
}

function mysteryDirectFamilyRelationLabel(subject: MysteryNpc, other: MysteryNpc, graph: MysteryFamilyStructure): MysteryFamilyRelationLabel | null {
  const pairMatches = (item: { aId: string; bId: string }) => mysteryGraphPairKey(item.aId, item.bId) === mysteryGraphPairKey(subject.id, other.id);
  if (graph.spouses.some(pairMatches)) return "spouse";
  if (graph.partners.some(pairMatches)) return "partner";
  if (graph.lovers.some(pairMatches)) return "lover";
  if (mysteryGraphAreSiblings(graph, subject.id, other.id)) return mysterySiblingRole(subject) as MysteryFamilyRelationLabel;
  if (graph.cousins.some(pairMatches)) return "cousin";
  if (graph.parentChild.some((item) => item.parentId === subject.id && item.childId === other.id)) return mysteryParentRole(subject) as MysteryFamilyRelationLabel;
  if (graph.parentChild.some((item) => item.parentId === other.id && item.childId === subject.id)) return mysteryChildRole(subject) as MysteryFamilyRelationLabel;
  if (graph.auntUncleNibling.some((item) => item.auntUncleId === subject.id && item.niblingId === other.id)) return mysterySexedRole(subject, "aunt", "uncle") as MysteryFamilyRelationLabel;
  if (graph.auntUncleNibling.some((item) => item.auntUncleId === other.id && item.niblingId === subject.id)) return mysterySexedRole(subject, "niece", "nephew") as MysteryFamilyRelationLabel;
  return null;
}

function mysteryDerivedFamilyRelationLabel(subject: MysteryNpc, other: MysteryNpc, graph: MysteryFamilyStructure): MysteryFamilyRelationLabel | null {
  const subjectParents = mysteryGraphParentsOf(graph, subject.id);
  const otherParents = mysteryGraphParentsOf(graph, other.id);
  const subjectChildren = mysteryGraphChildrenOf(graph, subject.id);
  const otherChildren = mysteryGraphChildrenOf(graph, other.id);

  if (subjectChildren.some((childId) => mysteryGraphChildrenOf(graph, childId).includes(other.id))) {
    return mysterySexedRole(subject, "grandmother", "grandfather") as MysteryFamilyRelationLabel;
  }
  if (subjectParents.some((parentId) => otherParents.some((otherParentId) => mysteryGraphAreSiblings(graph, parentId, otherParentId)))) {
    return "cousin";
  }
  if (subjectParents.some((parentId) => mysteryGraphAreSiblings(graph, parentId, other.id))) {
    return mysterySexedRole(subject, "niece", "nephew") as MysteryFamilyRelationLabel;
  }
  if (otherParents.some((parentId) => mysteryGraphAreSiblings(graph, subject.id, parentId))) {
    return mysterySexedRole(subject, "aunt", "uncle") as MysteryFamilyRelationLabel;
  }
  if (subjectParents.some((parentId) => otherChildren.includes(parentId))) {
    return mysterySexedRole(subject, "granddaughter", "grandson") as MysteryFamilyRelationLabel;
  }

  const otherPartners = [
    ...graph.spouses,
    ...graph.partners
  ].filter((pair) => pair.aId === other.id || pair.bId === other.id)
    .map((pair) => pair.aId === other.id ? pair.bId : pair.aId);
  if (subjectParents.some((parentId) => otherPartners.includes(parentId)) && !graph.parentChild.some((pair) => pair.parentId === other.id && pair.childId === subject.id)) {
    return mysterySexedRole(subject, "step-daughter", "step-son") as MysteryFamilyRelationLabel;
  }

  return null;
}

function mysteryWeakFamilyRelationLabel(subject: MysteryNpc, other: MysteryNpc, graph: MysteryFamilyStructure): MysteryWeakFamilyRelationLabel | null {
  const spouseIds = mysteryGraphOtherIds(graph.spouses, other.id);
  const partnerIds = mysteryGraphOtherIds(graph.partners, other.id);
  const loverIds = mysteryGraphOtherIds(graph.lovers, other.id);

  if (spouseIds.some((spouseId) => mysteryGraphHasPair(graph.lovers, subject.id, spouseId))) return "spouse's lover";
  if (partnerIds.some((partnerId) => mysteryGraphHasPair(graph.lovers, subject.id, partnerId))) return "partner's lover";

  if (spouseIds.some((spouseId) => graph.parentChild.some((pair) => pair.parentId === subject.id && pair.childId === spouseId))) {
    return mysteryParentRole(subject) === "mother" ? "mother-in-law" : "father-in-law";
  }
  if (spouseIds.some((spouseId) => mysteryGraphAreSiblings(graph, subject.id, spouseId))) {
    return mysterySiblingRole(subject) === "sister" ? "sister-in-law" : "brother-in-law";
  }
  if (spouseIds.some((spouseId) => mysteryGraphOtherIds(graph.spouses, subject.id).some((subjectSpouseId) => mysteryGraphAreSiblings(graph, subjectSpouseId, spouseId)))) {
    return mysterySexedRole(subject, "sister-in-law", "brother-in-law") as MysteryWeakFamilyRelationLabel;
  }
  if (mysteryGraphOtherIds(graph.spouses, subject.id).some((subjectSpouseId) => mysteryGraphAreSiblings(graph, subjectSpouseId, other.id))) {
    return mysterySexedRole(subject, "sister-in-law", "brother-in-law") as MysteryWeakFamilyRelationLabel;
  }

  for (const loverId of loverIds) {
    const loverRelation = mysteryDirectFamilyRelationLabel(subject, { ...other, id: loverId }, graph) ??
      mysteryDerivedFamilyRelationLabel(subject, { ...other, id: loverId }, graph);
    if (loverRelation) return `lover's ${loverRelation as MysteryCoreFamilyRelationLabel}` as MysteryWeakFamilyRelationLabel;
  }

  return null;
}

function mysteryFamilyRelationLabelFor(subject: MysteryNpc, other: MysteryNpc, graph: MysteryFamilyStructure): MysteryFamilyRelationLabel | null {
  if (subject.id === other.id) return null;
  return mysteryDirectFamilyRelationLabel(subject, other, graph) ?? mysteryDerivedFamilyRelationLabel(subject, other, graph) ?? mysteryWeakFamilyRelationLabel(subject, other, graph);
}

function addMysteryStoredFamilyLink(
  graph: MysteryFamilyGraph,
  subjectId: string,
  otherId: string,
  label: MysteryFamilyRelationLabel,
  source: MysteryStoredFamilyRelation["source"] = "direct"
) {
  if (subjectId === otherId) return;
  if (graph.links.some((link) => link.subjectId === subjectId && link.otherId === otherId && link.label === label)) return;
  graph.links.push({ subjectId, otherId, label, source });
}

function addMysteryStoredFamilyPair(
  graph: MysteryFamilyGraph,
  subject: MysteryNpc,
  other: MysteryNpc,
  subjectLabel: MysteryFamilyRelationLabel,
  otherLabel: MysteryFamilyRelationLabel,
  source: MysteryStoredFamilyRelation["source"] = "direct"
) {
  addMysteryStoredFamilyLink(graph, subject.id, other.id, subjectLabel, source);
  addMysteryStoredFamilyLink(graph, other.id, subject.id, otherLabel, source);
}

function mysteryFamilyStructureFromLinks(npcs: MysteryNpc[], graph?: MysteryFamilyGraph): MysteryFamilyStructure {
  const structure = emptyMysteryFamilyStructure();
  const byId = new Map(npcs.map((npc) => [npc.id, npc]));
  for (const link of graph?.links ?? []) {
    const subject = byId.get(link.subjectId);
    const other = byId.get(link.otherId);
    if (!subject || !other) continue;
    if (link.label === "mother" || link.label === "father") addMysteryGraphParent(structure, subject.id, other.id);
    if (link.label === "daughter" || link.label === "son") addMysteryGraphParent(structure, other.id, subject.id);
    if (link.label === "sister" || link.label === "brother") addMysteryGraphPair(structure.siblings, subject.id, other.id);
    if (link.label === "spouse") addMysteryGraphPair(structure.spouses, subject.id, other.id);
    if (link.label === "partner") addMysteryGraphPair(structure.partners, subject.id, other.id);
    if (link.label === "lover") addMysteryGraphPair(structure.lovers, subject.id, other.id);
    if (link.label === "cousin") addMysteryGraphPair(structure.cousins, subject.id, other.id);
    if (link.label === "aunt" || link.label === "uncle") addMysteryGraphAuntUncle(structure, subject.id, other.id);
    if (link.label === "niece" || link.label === "nephew") addMysteryGraphAuntUncle(structure, other.id, subject.id);
  }
  return structure;
}

function rebuildMysteryStoredFamilyRelations(npcs: MysteryNpc[], structure: MysteryFamilyStructure, graph: MysteryFamilyGraph) {
  const nextRelations: MysteryStoredFamilyRelation[] = [];
  for (const subject of npcs) {
    for (const other of npcs) {
      if (subject.id === other.id) continue;
      const direct = mysteryDirectFamilyRelationLabel(subject, other, structure);
      if (direct) {
        nextRelations.push({ subjectId: subject.id, otherId: other.id, label: direct, source: "direct" });
        continue;
      }
      const derived = mysteryDerivedFamilyRelationLabel(subject, other, structure);
      if (derived) {
        nextRelations.push({ subjectId: subject.id, otherId: other.id, label: derived, source: "derived" });
        continue;
      }
      const weak = mysteryWeakFamilyRelationLabel(subject, other, structure);
      if (weak) nextRelations.push({ subjectId: subject.id, otherId: other.id, label: weak, source: "weak" });
    }
  }
  graph.links.splice(0, graph.links.length, ...nextRelations.filter((relation, index, list) =>
    list.findIndex((candidate) => candidate.subjectId === relation.subjectId && candidate.otherId === relation.otherId && candidate.label === relation.label) === index
  ));
}

function mysteryStoredFamilyRelationLabel(subject: MysteryNpc, other: MysteryNpc, graph?: MysteryFamilyGraph): MysteryFamilyRelationLabel | null {
  return graph?.links?.find((relation) => relation.subjectId === subject.id && relation.otherId === other.id)?.label ?? null;
}

function mysteryFamilyGraphFromSavedFacts(mystery: Pick<MysteryGame, "familyGraph" | "npcRelationships" | "npcs">): MysteryFamilyGraph {
  const graph: MysteryFamilyGraph = { links: [...((mystery.familyGraph as any)?.links ?? (mystery.familyGraph as any)?.relations ?? [])] };
  const structure = mysteryFamilyStructureFromLinks(mystery.npcs, graph);
  const savedGraph = (mystery.familyGraph ?? {}) as Partial<MysteryFamilyStructure>;
  for (const pair of savedGraph.parentChild ?? []) addMysteryGraphParent(structure, pair.parentId, pair.childId);
  for (const pair of savedGraph.siblings ?? []) addMysteryGraphPair(structure.siblings, pair.aId, pair.bId);
  for (const pair of savedGraph.spouses ?? []) addMysteryGraphPair(structure.spouses, pair.aId, pair.bId);
  for (const pair of savedGraph.partners ?? []) addMysteryGraphPair(structure.partners, pair.aId, pair.bId);
  for (const pair of savedGraph.lovers ?? []) addMysteryGraphPair(structure.lovers, pair.aId, pair.bId);
  for (const pair of savedGraph.cousins ?? []) addMysteryGraphPair(structure.cousins, pair.aId, pair.bId);
  for (const pair of savedGraph.auntUncleNibling ?? []) addMysteryGraphAuntUncle(structure, pair.auntUncleId, pair.niblingId);
  const byId = new Map(mystery.npcs.map((npc) => [npc.id, npc]));
  for (const relationship of mystery.npcRelationships ?? []) {
    const from = byId.get(relationship.fromId);
    const to = byId.get(relationship.toId);
    if (!from || !to) continue;
    const detail = relationship.detail.toLowerCase();
    const fromName = fullName(from).toLowerCase();
    const toName = fullName(to).toLowerCase();
    if (relationship.kind === "Marriage") addMysteryGraphPair(structure.spouses, from.id, to.id);
    if (relationship.kind === "Romance") addMysteryGraphPair(structure.partners, from.id, to.id);
    if (relationship.kind === "Affair") addMysteryGraphPair(structure.lovers, from.id, to.id);
    if (relationship.kind !== "Family") continue;
    if (detail.includes("siblings")) addMysteryGraphPair(structure.siblings, from.id, to.id);
    if (detail.includes("cousins")) addMysteryGraphPair(structure.cousins, from.id, to.id);
    if (detail.includes(`${fromName} is parent to ${toName}`)) addMysteryGraphParent(structure, from.id, to.id);
    if (detail.includes(`${toName} is parent to ${fromName}`)) addMysteryGraphParent(structure, to.id, from.id);
    if (detail.includes(`${toName} is staying with mother ${fromName}`) || detail.includes(`${toName} is staying with father ${fromName}`)) addMysteryGraphParent(structure, from.id, to.id);
    if (detail.includes(`${fromName} is staying with mother ${toName}`) || detail.includes(`${fromName} is staying with father ${toName}`)) addMysteryGraphParent(structure, to.id, from.id);
    if (detail.includes(`${toName} is staying with aunt ${fromName}`) || detail.includes(`${toName} is staying with uncle ${fromName}`)) addMysteryGraphAuntUncle(structure, from.id, to.id);
    if (detail.includes(`${fromName} is staying with aunt ${toName}`) || detail.includes(`${fromName} is staying with uncle ${toName}`)) addMysteryGraphAuntUncle(structure, to.id, from.id);
    if (detail.includes(`${toName} is staying with older sister ${fromName}`) || detail.includes(`${toName} is staying with older brother ${fromName}`)) addMysteryGraphPair(structure.siblings, from.id, to.id);
    if (detail.includes(`${fromName} is staying with older sister ${toName}`) || detail.includes(`${fromName} is staying with older brother ${toName}`)) addMysteryGraphPair(structure.siblings, from.id, to.id);
  }
  mysteryNormalizeParentChildStructure(mystery.npcs, structure);
  closeMysteryFamilyGraphCousinsAcrossSiblings(structure);
  rebuildMysteryStoredFamilyRelations(mystery.npcs, structure, graph);
  return graph;
}

function replaceMysteryFamilyGraph(target: MysteryFamilyGraph, source: MysteryFamilyGraph) {
  target.links.splice(0, target.links.length, ...source.links);
}

function mysteryFamilyGraphBloodPairKeys(graph: MysteryFamilyStructure): Set<string> {
  return new Set([
    ...graph.parentChild.map((item) => mysteryGraphPairKey(item.parentId, item.childId)),
    ...graph.siblings.map((item) => mysteryGraphPairKey(item.aId, item.bId)),
    ...graph.cousins.map((item) => mysteryGraphPairKey(item.aId, item.bId)),
    ...graph.auntUncleNibling.map((item) => mysteryGraphPairKey(item.auntUncleId, item.niblingId))
  ]);
}

function repairMysteryFamilyGraphConsistency(npcs: MysteryNpc[], relationships: MysteryNpcRelationship[], familyGraph: MysteryFamilyGraph): string[] {
  const sanityLines: string[] = [];
  const byId = new Map(npcs.map((npc) => [npc.id, npc]));
  const ids = new Set(byId.keys());
  const nextGraph = mysteryFamilyGraphFromSavedFacts({ familyGraph, npcRelationships: relationships, npcs });
  replaceMysteryFamilyGraph(familyGraph, nextGraph);
  const familyStructure = mysteryFamilyStructureFromLinks(npcs, familyGraph);
  const validPair = (aId: string, bId: string) => aId !== bId && ids.has(aId) && ids.has(bId);
  const uniquePairs = (pairs: { aId: string; bId: string }[]) => {
    const seen = new Set<string>();
    return pairs.filter((item) => {
      if (!validPair(item.aId, item.bId)) return false;
      const key = mysteryGraphPairKey(item.aId, item.bId);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };
  familyStructure.siblings.splice(0, familyStructure.siblings.length, ...uniquePairs(familyStructure.siblings));
  familyStructure.spouses.splice(0, familyStructure.spouses.length, ...uniquePairs(familyStructure.spouses));
  familyStructure.partners.splice(0, familyStructure.partners.length, ...uniquePairs(familyStructure.partners));
  familyStructure.lovers.splice(0, familyStructure.lovers.length, ...uniquePairs(familyStructure.lovers));
  familyStructure.cousins.splice(0, familyStructure.cousins.length, ...uniquePairs(familyStructure.cousins));
  familyStructure.parentChild.splice(0, familyStructure.parentChild.length, ...familyStructure.parentChild.filter((item, index, list) => {
    const parent = byId.get(item.parentId);
    const child = byId.get(item.childId);
    if (!parent || !child || item.parentId === item.childId || parent.age < child.age + 14) return false;
    return list.findIndex((candidate) => candidate.parentId === item.parentId && candidate.childId === item.childId) === index;
  }));
  const initialPrunedParents = mysteryNormalizeParentChildStructure(npcs, familyStructure);
  if (initialPrunedParents > 0) sanityLines.push(`Family repair: removed ${initialPrunedParents} duplicate parent link(s).`);
  familyStructure.auntUncleNibling.splice(0, familyStructure.auntUncleNibling.length, ...familyStructure.auntUncleNibling.filter((item, index, list) => {
    if (!validPair(item.auntUncleId, item.niblingId)) return false;
    return list.findIndex((candidate) => candidate.auntUncleId === item.auntUncleId && candidate.niblingId === item.niblingId) === index;
  }));
  const removeBloodPairConflicts = () => {
    const directParentChildKeys = new Set(familyStructure.parentChild.map((pair) => mysteryGraphPairKey(pair.parentId, pair.childId)));
    familyStructure.siblings.splice(0, familyStructure.siblings.length, ...familyStructure.siblings.filter((pair) => !directParentChildKeys.has(mysteryGraphPairKey(pair.aId, pair.bId))));
    const directSiblingKeys = new Set(familyStructure.siblings.map((pair) => mysteryGraphPairKey(pair.aId, pair.bId)));
    familyStructure.cousins.splice(0, familyStructure.cousins.length, ...familyStructure.cousins.filter((pair) => {
      const key = mysteryGraphPairKey(pair.aId, pair.bId);
      return !directParentChildKeys.has(key) && !directSiblingKeys.has(key);
    }));
    familyStructure.auntUncleNibling.splice(0, familyStructure.auntUncleNibling.length, ...familyStructure.auntUncleNibling.filter((pair) => {
      const key = mysteryGraphPairKey(pair.auntUncleId, pair.niblingId);
      return !directParentChildKeys.has(key) && !directSiblingKeys.has(key);
    }));
  };
  removeBloodPairConflicts();

  const parents = new Map<string, string[]>();
  const addParent = (parentId: string, childId: string) => {
    if (!parents.has(childId)) parents.set(childId, []);
    parents.get(childId)!.push(parentId);
  };
  for (const pair of familyStructure.parentChild) addParent(pair.parentId, pair.childId);
  const childrenByParent = new Map<string, string[]>();
  for (const pair of familyStructure.parentChild) {
    if (!childrenByParent.has(pair.parentId)) childrenByParent.set(pair.parentId, []);
    childrenByParent.get(pair.parentId)!.push(pair.childId);
  }
  for (const children of childrenByParent.values()) {
    for (let leftIndex = 0; leftIndex < children.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < children.length; rightIndex += 1) {
        addMysteryGraphPair(familyStructure.siblings, children[leftIndex], children[rightIndex]);
      }
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    const siblingGroups = new Map<string, Set<string>>();
    const find = (id: string): Set<string> => {
      for (const group of siblingGroups.values()) {
        if (group.has(id)) return group;
      }
      const group = new Set<string>([id]);
      siblingGroups.set(id, group);
      return group;
    };
    for (const pair of familyStructure.siblings) {
      const left = find(pair.aId);
      const right = find(pair.bId);
      if (left === right) continue;
      for (const id of right) left.add(id);
      siblingGroups.delete(pair.bId);
    }
    for (const group of siblingGroups.values()) {
      const idsInGroup = Array.from(group);
      for (let leftIndex = 0; leftIndex < idsInGroup.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < idsInGroup.length; rightIndex += 1) {
          const before = familyStructure.siblings.length;
          addMysteryGraphPair(familyStructure.siblings, idsInGroup[leftIndex], idsInGroup[rightIndex]);
          changed = changed || familyStructure.siblings.length > before;
        }
      }
      const sharedParentIds = new Set(idsInGroup.flatMap((id) => parents.get(id) ?? []));
      for (const parentId of sharedParentIds) {
        for (const childId of idsInGroup) {
          const parent = byId.get(parentId);
          const child = byId.get(childId);
          if (!parent || !child || parent.age < child.age + 14) continue;
          const before = familyStructure.parentChild.length;
          addMysteryGraphParent(familyStructure, parentId, childId);
          if (familyStructure.parentChild.length > before) {
            addParent(parentId, childId);
            changed = true;
          }
        }
      }
    }
  }
  const finalPrunedParents = mysteryNormalizeParentChildStructure(npcs, familyStructure);
  if (finalPrunedParents > 0) sanityLines.push(`Family repair: removed ${finalPrunedParents} duplicate parent link(s) after sibling closure.`);
  const cousinBefore = familyStructure.cousins.length;
  closeMysteryFamilyGraphCousinsAcrossSiblings(familyStructure);
  if (familyStructure.cousins.length > cousinBefore) {
    sanityLines.push(`Family repair: extended ${familyStructure.cousins.length - cousinBefore} cousin link(s) across sibling groups.`);
  }
  const conflictCountsBefore = familyStructure.siblings.length + familyStructure.cousins.length + familyStructure.auntUncleNibling.length;
  removeBloodPairConflicts();
  const conflictCountsAfter = familyStructure.siblings.length + familyStructure.cousins.length + familyStructure.auntUncleNibling.length;
  if (conflictCountsAfter < conflictCountsBefore) {
    sanityLines.push(`Family repair: removed ${conflictCountsBefore - conflictCountsAfter} contradictory blood-family link(s).`);
  }

  const relationshipPairHasKind = (kind: MysteryNpcRelationshipKind, aId: string, bId: string) => relationships.some((relationship) =>
    relationship.kind === kind && mysteryGraphPairKey(relationship.fromId, relationship.toId) === mysteryGraphPairKey(aId, bId)
  );
  const keptParentClaims = new Set(familyStructure.parentChild.map((pair) => mysteryGraphDirectedParentKey(pair.parentId, pair.childId)));
  const parentClaimForRelationship = (relationship: MysteryNpcRelationship): { parentId: string; childId: string } | null => {
    if (relationship.kind !== "Family") return null;
    const from = byId.get(relationship.fromId);
    const to = byId.get(relationship.toId);
    if (!from || !to) return null;
    const detail = relationship.detail.toLowerCase();
    const fromName = fullName(from).toLowerCase();
    const toName = fullName(to).toLowerCase();
    if (detail.includes(`${fromName} is parent to ${toName}`)) return { parentId: from.id, childId: to.id };
    if (detail.includes(`${toName} is parent to ${fromName}`)) return { parentId: to.id, childId: from.id };
    if (detail.includes(`${toName} is staying with mother ${fromName}`) || detail.includes(`${toName} is staying with father ${fromName}`)) return { parentId: from.id, childId: to.id };
    if (detail.includes(`${fromName} is staying with mother ${toName}`) || detail.includes(`${fromName} is staying with father ${toName}`)) return { parentId: to.id, childId: from.id };
    return null;
  };
  const relationshipsBeforeParentPrune = relationships.length;
  for (let index = relationships.length - 1; index >= 0; index -= 1) {
    const claim = parentClaimForRelationship(relationships[index]);
    if (claim && !keptParentClaims.has(mysteryGraphDirectedParentKey(claim.parentId, claim.childId))) {
      relationships.splice(index, 1);
    }
  }
  if (relationships.length < relationshipsBeforeParentPrune) {
    sanityLines.push(`Family repair: removed ${relationshipsBeforeParentPrune - relationships.length} stale parent relationship claim(s).`);
  }
  for (const pair of familyStructure.siblings) {
    const left = byId.get(pair.aId);
    const right = byId.get(pair.bId);
    if (!left || !right || relationshipPairHasKind("Family", left.id, right.id)) continue;
    if (addMysteryNpcRelationship(relationships, left, right, "Family", `${fullName(left)} and ${fullName(right)} are siblings.`, { trustImpact: 8, motiveRisk: 2, skipGuards: true })) {
      sanityLines.push(`Family repair: added missing sibling link between ${fullName(left)} and ${fullName(right)}.`);
    }
  }
  for (const pair of familyStructure.parentChild) {
    const parent = byId.get(pair.parentId);
    const child = byId.get(pair.childId);
    if (!parent || !child || relationshipPairHasKind("Family", parent.id, child.id)) continue;
    if (addMysteryNpcRelationship(relationships, parent, child, "Family", `${fullName(parent)} is parent to ${fullName(child)}.`, { trustImpact: 9, motiveRisk: 3, skipGuards: true })) {
      sanityLines.push(`Family repair: added missing parent link between ${fullName(parent)} and ${fullName(child)}.`);
    }
  }
  for (const pair of familyStructure.cousins) {
    const left = byId.get(pair.aId);
    const right = byId.get(pair.bId);
    if (!left || !right || relationshipPairHasKind("Family", left.id, right.id)) continue;
    if (addMysteryNpcRelationship(relationships, left, right, "Family", `${fullName(left)} and ${fullName(right)} are cousins.`, { trustImpact: 5, motiveRisk: 2, skipGuards: true })) {
      sanityLines.push(`Family repair: added missing cousin link between ${fullName(left)} and ${fullName(right)}.`);
    }
  }

  const bloodPairs = mysteryFamilyGraphBloodPairKeys(familyStructure);
  const romanceBefore = relationships.length;
  for (let index = relationships.length - 1; index >= 0; index -= 1) {
    const relationship = relationships[index];
    if (mysteryIsRomanticRelationship(relationship.kind) && bloodPairs.has(mysteryGraphPairKey(relationship.fromId, relationship.toId))) {
      relationships.splice(index, 1);
    }
  }
  familyStructure.spouses.splice(0, familyStructure.spouses.length, ...familyStructure.spouses.filter((pair) => !bloodPairs.has(mysteryGraphPairKey(pair.aId, pair.bId))));
  familyStructure.partners.splice(0, familyStructure.partners.length, ...familyStructure.partners.filter((pair) => !bloodPairs.has(mysteryGraphPairKey(pair.aId, pair.bId))));
  familyStructure.lovers.splice(0, familyStructure.lovers.length, ...familyStructure.lovers.filter((pair) => !bloodPairs.has(mysteryGraphPairKey(pair.aId, pair.bId))));
  if (relationships.length !== romanceBefore) sanityLines.push("Family repair: removed romantic relationship links that conflicted with blood family.");
  rebuildMysteryStoredFamilyRelations(npcs, familyStructure, familyGraph);
  return sanityLines;
}

function mysteryTitleCaseRelation(relation: string): string {
  return relation.split(" ").map(titleCase).join(" ");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mysterySentenceCaseText(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed[0].toUpperCase() + trimmed.slice(1);
}

function mysteryStripPlayerHiddenFindableMeta(value: string): string {
  return cleanRavenwoodNameText(value)
    .replace(/\bmurder proof\b/gi, "case clue")
    .replace(/\bactual murder\b/gi, "case")
    .replace(/\bproof\b/gi, "clue")
    .replace(/\bproving\b/gi, "suggesting")
    .replace(/\bthe day of the murder\b/gi, "that same day")
    .replace(/\s*(?:,?\s*)?but (?:it )?(?:does not|doesn't) [^.]*\b(?:murder|killing|crime)\b[^.]*\./gi, ".")
    .replace(/\s*(?:,?\s*)?without suggesting a killing\./gi, ".")
    .replace(/\s*(?:,?\s*)?not because it suggests murder\./gi, ".")
    .replace(/\s*;\s*search roll\s+\d+\b.*$/i, "")
    .replace(/\s*(?:\.|;)?\s*Can be found\b.*$/i, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+\./g, ".")
    .trim();
}

function mysteryFindablePlayerFacingNameValue(findable: MysteryFindable): string {
  if (findable.playerName) return cleanRavenwoodNameText(findable.playerName);
  if (findable.kind !== "Proof") return cleanRavenwoodNameText(findable.name);
  return cleanRavenwoodNameText(findable.name)
    .replace(/\s+(?:listing|accusing|naming|proving|with|from|wrapped|used|altered|tied|explaining|belonging to|matching)\b.*$/i, "")
    .trim();
}

function mysteryFindablePlayerFacingDescriptionValue(findable: MysteryFindable): string {
  if (findable.playerDescription !== undefined) return mysteryStripPlayerHiddenFindableMeta(findable.playerDescription);
  const displayName = mysteryFindablePlayerFacingNameValue(findable);
  const description = mysteryStripPlayerHiddenFindableMeta(findable.description);
  if (findable.kind === "Proof" && displayName && description.toLowerCase().startsWith(`${displayName.toLowerCase()} `)) {
    const cleanedProofDescription = description
      .slice(displayName.length)
      .replace(/^[,.;:\s]+/g, "")
      .replace(/^listing\s+(.+?)\s+owed\s+(.+?)\s+money\b/i, "It lists $1 owing $2 money")
      .replace(/^listing\b/i, "It lists")
      .replace(/^accusing\b/i, "It accuses")
      .replace(/^naming\b/i, "It names")
      .replace(/^suggesting\b/i, "It suggests")
      .replace(/^showing\b/i, "It shows")
      .replace(/^with\b/i, "It has")
      .replace(/^from\b/i, "It comes from")
      .replace(/^wrapped\b/i, "It is wrapped")
      .replace(/^used\b/i, "It was used")
      .replace(/^altered\b/i, "It was altered")
      .replace(/^tied\b/i, "It is tied")
      .replace(/^explaining\b/i, "It explains")
      .replace(/^belonging\b/i, "It belongs")
      .replace(/^matching\b/i, "It matches")
      .trim();
    return mysterySentenceCaseText(cleanedProofDescription.replace(/[.]+$/g, "")) + ".";
  }
  const ownerMatch = findable.name.match(/\bbelonging to\s+(.+)$/i);
  if (!ownerMatch || ownerMatch.index === undefined) return description;
  const ownerName = ownerMatch[1].replace(/[.]+$/g, "").trim();
  const itemName = findable.name.slice(0, ownerMatch.index).trim();
  if (!ownerName || !itemName) return description;
  const articleItemPattern = `(?:a|an|the)?\\s*${escapeRegExp(itemName)}`;
  const ownerPattern = escapeRegExp(ownerName);
  const duplicateLead = new RegExp(
    `^${articleItemPattern}\\s+(?:belonging to|associated with|linked to|connected to)\\s+${ownerPattern}\\s*,?\\s*`,
    "i"
  );
  const possessiveLead = new RegExp(
    `^${ownerPattern}'s\\s+${escapeRegExp(itemName)}\\s*,?\\s*`,
    "i"
  );
  const cleaned = description
    .replace(duplicateLead, "")
    .replace(possessiveLead, "")
    .replace(/^[,.;:\s]+/g, "")
    .trim();
  if (!cleaned || cleaned === description) return description;
  return mysterySentenceCaseText(cleaned.replace(/[.]+$/g, "")) + ".";
}

function mysteryTextWithoutPunctuation(value: string): string {
  return cleanRavenwoodNameText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mysteryFindableDiscoveryDescriptionForMessage(findable: MysteryFindable): string {
  const name = mysteryFindablePlayerFacingNameValue(findable);
  const description = mysteryFindablePlayerFacingDescriptionValue(findable);
  const normalizedName = mysteryTextWithoutPunctuation(name);
  const normalizedDescription = mysteryTextWithoutPunctuation(description);
  if (!normalizedDescription || normalizedDescription === normalizedName) return "";
  if (normalizedName && normalizedDescription.startsWith(normalizedName)) {
    const remainder = normalizedDescription.slice(normalizedName.length).trim();
    if (!remainder || /^(it|this|that|the|a|an)\b/.test(remainder)) return "";
  }
  return description;
}

function mysteryWithPlayerFacingFindableText(findable: MysteryFindable): MysteryFindable {
  return {
    ...findable,
    playerName: mysteryFindablePlayerFacingNameValue(findable),
    playerDescription: mysteryFindablePlayerFacingDescriptionValue(findable)
  };
}

function mysteryIsStaffGuestPair(a: MysteryNpc, b: MysteryNpc): boolean {
  return a.role !== b.role;
}

function mysteryAllowsStaffGuestBloodFamily(a: MysteryNpc, b: MysteryNpc): boolean {
  return !mysteryIsStaffGuestPair(a, b) || roll(0.04);
}

function mysteryAllowsLargeAgeGapRomance(a: MysteryNpc, b: MysteryNpc): boolean {
  const crossesFifty = (a.age >= 50 && b.age < 50) || (b.age >= 50 && a.age < 50);
  return !crossesFifty || roll(0.08);
}

function mysteryOppositeSex(sex: Sex): Sex {
  return sex === "Female" ? "Male" : "Female";
}

function mysteryWeightedRomanticSex(partner: MysteryNpc): Sex {
  return roll(0.7) ? mysteryOppositeSex(partner.sex) : partner.sex;
}

function mysteryPickWeightedRomanticCandidate(anchor: MysteryNpc, candidates: MysteryNpc[]): MysteryNpc | undefined {
  const validCandidates = candidates.filter((candidate) => candidate.id !== anchor.id);
  if (validCandidates.length === 0) return undefined;
  const oppositeSexCandidates = validCandidates.filter((candidate) => candidate.sex !== anchor.sex);
  const sameSexCandidates = validCandidates.filter((candidate) => candidate.sex === anchor.sex);
  if (oppositeSexCandidates.length > 0 && sameSexCandidates.length > 0) {
    return pick(roll(0.7) ? oppositeSexCandidates : sameSexCandidates);
  }
  return pick(validCandidates);
}

function mysteryIsRomanticRelationship(kind: MysteryNpcRelationshipKind): boolean {
  return kind === "Marriage" || kind === "Romance" || kind === "Affair";
}

function mysteryIsOfficialPartnerRelationship(kind: MysteryNpcRelationshipKind): boolean {
  return kind === "Marriage" || kind === "Romance";
}

function mysteryIsBloodFamilyDetail(detail: string): boolean {
  return /\b(parent|mother|father|sibling|sister|brother|cousin|aunt|uncle|niece|nephew|son|daughter)\b/i.test(detail);
}

function mysteryHasSpouseRelationship(relationships: MysteryNpcRelationship[], npc: MysteryNpc): boolean {
  return relationships.some((relationship) =>
    relationship.kind === "Marriage" &&
    (relationship.fromId === npc.id || relationship.toId === npc.id)
  );
}

function mysterySpouseFor(relationships: MysteryNpcRelationship[], npc: MysteryNpc, npcs: MysteryNpc[]): MysteryNpc | undefined {
  const spouseLink = mysteryRelationshipsWithSingleSpouses(relationships).find((relationship) =>
    relationship.kind === "Marriage" &&
    (relationship.fromId === npc.id || relationship.toId === npc.id)
  );
  const spouseId = spouseLink ? (spouseLink.fromId === npc.id ? spouseLink.toId : spouseLink.fromId) : undefined;
  return spouseId ? npcs.find((candidate) => candidate.id === spouseId) : undefined;
}

function mysteryHasOfficialPartnerFor(relationships: MysteryNpcRelationship[], npc: MysteryNpc): boolean {
  return relationships.some((relationship) =>
    mysteryIsOfficialPartnerRelationship(relationship.kind) &&
    (relationship.fromId === npc.id || relationship.toId === npc.id)
  );
}

function mysteryHasOfficialPartnerStatus(npc: MysteryNpc): boolean {
  return /\b(married|in a relationship|engaged|open relationship)\b/i.test(npc.familyStatus) && !/\b(secret|break|unsure|open to explore)\b/i.test(npc.familyStatus);
}

function addMysteryNpcRelationship(
  relationships: MysteryNpcRelationship[],
  from: MysteryNpc,
  to: MysteryNpc,
  kind: MysteryNpcRelationshipKind,
  detail: string,
  options: Partial<Pick<MysteryNpcRelationship, "hidden" | "trustImpact" | "motiveRisk" | "availableDay" | "availableDaytime">> & { skipGuards?: boolean } = {}
) {
  if (from.id === to.id) return false;
  if (!options.skipGuards && kind === "Family" && mysteryIsBloodFamilyDetail(detail) && !mysteryAllowsStaffGuestBloodFamily(from, to)) return false;
  if (!options.skipGuards && mysteryIsRomanticRelationship(kind) && !mysteryAllowsLargeAgeGapRomance(from, to)) return false;
  if (kind === "Romance" && (mysteryHasOfficialPartnerStatus(from) || mysteryHasOfficialPartnerStatus(to))) return false;
  if (mysteryIsOfficialPartnerRelationship(kind) && relationships.some((relationship) =>
    mysteryIsOfficialPartnerRelationship(relationship.kind) &&
    (relationship.fromId === from.id || relationship.toId === from.id || relationship.fromId === to.id || relationship.toId === to.id)
  )) return false;
  const duplicate = relationships.some((relationship) =>
    relationship.kind === kind &&
    ((relationship.fromId === from.id && relationship.toId === to.id) || (relationship.fromId === to.id && relationship.toId === from.id)) &&
    relationship.detail === detail
  );
  if (duplicate) return false;
  if (kind === "Marriage") {
    from.familyStatus = "Married";
    to.familyStatus = "Married";
  }
  if (kind === "Romance") {
    from.familyStatus = "In a relationship";
    to.familyStatus = "In a relationship";
  }
  if (kind === "Affair" && !mysteryHasOfficialPartnerFor(relationships, from)) {
    from.familyStatus = "Secretly dating";
  }
  if (kind === "Affair" && !mysteryHasOfficialPartnerFor(relationships, to)) {
    to.familyStatus = "Secretly dating";
  }
  relationships.push({
    id: uid(),
    fromId: from.id,
    toId: to.id,
    kind,
    detail,
    hidden: options.hidden ?? false,
    trustImpact: options.trustImpact ?? 0,
    motiveRisk: options.motiveRisk ?? 0,
    availableDay: options.availableDay,
    availableDaytime: options.availableDaytime
  });
  return true;
}

function mysteryRelationshipsWithSingleSpouses(relationships: MysteryNpcRelationship[]): MysteryNpcRelationship[] {
  const officialPartnerNpcIds = new Set<string>();
  return [...relationships]
    .sort((left, right) =>
      (left.kind === "Marriage" ? 0 : left.kind === "Romance" ? 1 : 2) -
      (right.kind === "Marriage" ? 0 : right.kind === "Romance" ? 1 : 2)
    )
    .filter((relationship) => {
    if (!mysteryIsOfficialPartnerRelationship(relationship.kind)) return true;
    if (officialPartnerNpcIds.has(relationship.fromId) || officialPartnerNpcIds.has(relationship.toId)) return false;
    officialPartnerNpcIds.add(relationship.fromId);
    officialPartnerNpcIds.add(relationship.toId);
    return true;
    });
}

function mysteryDisplayFamilyStatus(npc: MysteryNpc, mystery: MysteryGame): string {
  const validRelationships = mysteryRelationshipsWithSingleSpouses(mystery.npcRelationships ?? []);
  const hasHotelMarriage = validRelationships.some((relationship) =>
    relationship.kind === "Marriage" &&
    (relationship.fromId === npc.id || relationship.toId === npc.id)
  );
  if (hasHotelMarriage) return "Married";
  const hasHotelPartner = validRelationships.some((relationship) =>
    relationship.kind === "Romance" &&
    (relationship.fromId === npc.id || relationship.toId === npc.id)
  );
  if (hasHotelPartner) return "In a relationship";
  const hasPrivateLover = validRelationships.some((relationship) =>
    relationship.kind === "Affair" &&
    (relationship.fromId === npc.id || relationship.toId === npc.id)
  );
  if (hasPrivateLover) return "Secretly dating";
  const outsideHotelStatuses = new Set([
    "Married",
    "In a relationship",
    "Engaged",
    "Secretly dating",
    "Secretly engaged",
    "In an open relationship",
    "On a break from a relationship"
  ]);
  return outsideHotelStatuses.has(npc.familyStatus) ? `${npc.familyStatus} (outside of hotel)` : npc.familyStatus;
}

function mysterySecretSentenceForNpc(npc: MysteryNpc): string {
  const secret = npc.secret.trim().replace(/\.$/, "");
  return `${fullName(npc)} ${secret.charAt(0).toLowerCase()}${secret.slice(1)}.`;
}

function mysteryServantKnowledgeDetail(staffMember: MysteryNpc, guest: MysteryNpc, npcs: MysteryNpc[] = [staffMember, guest]): string {
  const facts = [
    `reason of stay - ${guest.reasonOfStay}`,
    `secret - ${cleanSentenceEnd(mysteryResolveNpcSecretPlaceholders(guest.secret, guest, npcs))}`
  ];
  return `${fullName(staffMember)} regularly serves ${fullName(guest)} and knows their habits: ${facts.join("; ")}.`;
}

function mysteryServantKnowledgeDetailForSheet(detail: string, npcs: MysteryNpc[]): string {
  const match = detail.match(/^(.+?) regularly serves (.+?) and knows their habits:/i);
  if (!match) return detail;
  const servedName = match[2].trim().toLowerCase();
  const guest = [...npcs]
    .sort((a, b) => fullName(b).length - fullName(a).length)
    .find((candidate) => fullName(candidate).toLowerCase() === servedName);
  if (!guest) return detail;
  const facts = [
    `reason of stay - ${guest.reasonOfStay}`,
    `secret - ${cleanSentenceEnd(mysteryResolveNpcSecretPlaceholders(guest.secret, guest, npcs))}`
  ];
  return `${match[1].trim()} regularly serves ${fullName(guest)} and knows their habits: ${facts.join("; ")}.`;
}

function mysteryRelationshipDetailWithKnownSecret(detail: string, npcs: MysteryNpc[], playerFirstName?: string): string {
  if (!/\bsecret about\b/i.test(detail)) return detail;
  const lowerDetail = detail.toLowerCase();
  const target = [...npcs]
    .sort((a, b) => fullName(b).length - fullName(a).length)
    .find((candidate) => lowerDetail.includes(`secret about ${fullName(candidate).toLowerCase()}`));
  if (!target) return detail;
  return `${detail} (${mysterySecretSentenceForNpc(target)})`;
}

function mysteryOverheardMeaningDetailForSheet(detail: string, npcs: MysteryNpc[]): string {
  const adultCleaned = npcs
    .filter((npc) => !npc.isChild && npc.age >= 18)
    .reduce((text, npc) => text.replace(
      new RegExp(`\\b${escapeRegExp(fullName(npc))} overheard ([^.!?]+?) arguing and has not understood the meaning yet\\.`, "gi"),
      `${fullName(npc)} overheard $1 arguing with someone.`
    ), detail);
  return adultCleaned.replace(/\boverheard ([^.!?]+?) arguing\./gi, "overheard $1 arguing with someone.");
}

function mysteryRelationshipDetailForSheet(detail: string, npcs: MysteryNpc[], playerFirstName?: string): string {
  return mysteryServantKnowledgeDetailForSheet(mysteryOverheardMeaningDetailForSheet(mysteryRelationshipDetailWithKnownSecret(detail, npcs, playerFirstName), npcs), npcs)
    .replace(/^.*?\b(Witness:\s*)/i, "$1")
    .replace(/\b(heard|saw|noticed|overheard)\s+([^.!?]*?)\s+tuck away\s+Witness:\s*/i, "Witness: ")
    .replace(/,\s*but\s+[^.]*?\bwon't tell the player unless[^.]*\./gi, ".")
    .replace(/,\s*but\s+[^.]*?\bwill not tell the player unless[^.]*\./gi, ".")
    .replace(/,\s*but\s+[^.]*?\bwill only speak after trust is gained\./gi, ".")
    .replace(/\bpass by a service route that does not match their public alibi and is frightened to say it openly shortly after ([^.!?]+?) died\b/gi, "pass by a service route shortly after $1 died that does not match their public alibi and is frightened to say it openly")
    .replace(/\bshortly after ([^.!?]+?) died,\s*but\b/gi, "shortly after $1 died")
    .replace(/became romantically involved during an earlier Ravenwood stay/gi, "became romantically involved during private time at Ravenwood")
    .replace(/has been meeting (.*?) in private again after a previous stay/gi, "has been meeting $1 in private around Ravenwood")
    .replace(/became close during an earlier Ravenwood stay and have remained loyal friends/gi, "became close during their time around Ravenwood and have remained loyal friends")
    .replace(/which could ruin more than one reputation/gi, "which could ruin both of their reputations")
    .replace(/^Witness:\s*/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function mysteryRelationshipDetailForDisplay(relationship: MysteryNpcRelationship, from: MysteryNpc, to: MysteryNpc, npcs: MysteryNpc[], playerFirstName?: string): string {
  if (relationship.kind === "Debt" && /\bowes\b.+\ba favor\b/i.test(relationship.detail)) {
    return `${fullName(from)} owes ${fullName(to)} money.`;
  }
  return mysteryRelationshipDetailForSheet(relationship.detail, npcs, playerFirstName);
}

function mysteryRelationshipLinesFor(npc: MysteryNpc, npcs: MysteryNpc[], relationships: MysteryNpcRelationship[], currentDay?: number, currentDaytime?: Daytime, playerFirstName?: string, familyGraph?: MysteryFamilyGraph): string[] {
  const directRelationships = mysteryRelationshipsWithSingleSpouses(relationships)
    .filter((relationship) => relationship.fromId === npc.id || relationship.toId === npc.id)
  const directPairKeys = new Set(directRelationships.map((relationship) => mysteryGraphPairKey(relationship.fromId, relationship.toId)));
  const relationshipLines = directRelationships.map((relationship) => {
      const otherId = relationship.fromId === npc.id ? relationship.toId : relationship.fromId;
      const other = npcs.find((candidate) => candidate.id === otherId);
      const availableFrom = relationship.availableDay && relationship.availableDaytime
        ? `, available from ${mysteryAvailabilityLabel(relationship.availableDay, relationship.availableDaytime)}`
        : "";
      const visibility = relationship.hidden ? `hidden, testing visible${availableFrom}` : "known";
      const graphRoleLabel = other && (relationship.kind === "Family" || relationship.kind === "Marriage")
        ? mysteryStoredFamilyRelationLabel(npc, other, familyGraph)
        : null;
      const from = npcs.find((candidate) => candidate.id === relationship.fromId);
      const to = npcs.find((candidate) => candidate.id === relationship.toId);
      const detail = other && graphRoleLabel
        ? mysteryFamilyRelationSentenceForLabel(npc, other, graphRoleLabel)
        : other && relationship.kind === "Family"
          ? mysteryFamilyRelationshipSentence(npc, other, relationship)
          : from && to
            ? mysteryRelationshipDetailForDisplay(relationship, from, to, npcs, playerFirstName)
            : mysteryRelationshipDetailForSheet(relationship.detail, npcs, playerFirstName);
      const hiddenMarker = relationship.hidden ? `(${visibility}): ` : "";
      return `${hiddenMarker}${detail}`;
    });
  const graphLines = familyGraph
    ? npcs
      .filter((other) => other.id !== npc.id && !directPairKeys.has(mysteryGraphPairKey(npc.id, other.id)))
      .map((other) => {
        const rolePhrase = mysteryGraphFamilyRolePhrase(npc, other, familyGraph);
        const roleLabel = mysteryStoredFamilyRelationLabel(npc, other, familyGraph);
        return rolePhrase && roleLabel ? mysteryFamilyRelationSentenceForLabel(npc, other, roleLabel) : null;
      })
      .filter((line): line is string => Boolean(line))
    : [];
  return [...relationshipLines, ...graphLines];
}

function mysteryResidentRelationshipLineForDisplay(line: string): string {
  return line
    .replace(/\(hidden, testing visible(?:,\s*[^)]*)?\):\s*/g, "")
    .replace(/\(hidden, testing visible\):?\s*/g, "")
    .replace(/\(known\):?\s*/g, "")
    .replace(/\s+\./g, ".")
    .replace(/\.{2,}/g, ".")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function mysterySexedRole(npc: MysteryNpc, female: string, male: string): string {
  return npc.sex === "Female" ? female : male;
}

function mysteryChildRole(npc: MysteryNpc): string {
  return mysterySexedRole(npc, "daughter", "son");
}

function mysteryParentRole(npc: MysteryNpc): string {
  return mysterySexedRole(npc, "mother", "father");
}

function mysterySiblingRole(npc: MysteryNpc): string {
  return mysterySexedRole(npc, "sister", "brother");
}

function mysteryGuardianRoleFromDetail(detail: string, child: MysteryNpc, guardian: MysteryNpc): string | null {
  const normalized = detail.toLowerCase();
  const childName = fullName(child).toLowerCase();
  const guardianName = fullName(guardian).toLowerCase();
  const match = normalized.match(new RegExp(`${escapeRegExp(childName)} is staying with (mother|father|aunt|uncle|older sister|older brother) ${escapeRegExp(guardianName)}`));
  return match?.[1] ?? null;
}

function mysteryFamilyRolePhrase(subject: MysteryNpc, other: MysteryNpc, relationship: MysteryNpcRelationship): string | null {
  const detail = relationship.detail.toLowerCase();
  const subjectName = fullName(subject).toLowerCase();
  const otherName = fullName(other).toLowerCase();
  if (detail.includes("siblings")) return `${mysterySiblingRole(subject)} of`;
  if (detail.includes("cousins")) return "cousin of";
  if (detail.includes(`${subjectName} is parent to ${otherName}`)) return `${mysteryParentRole(subject)} of ${mysteryChildRole(other)}`;
  if (detail.includes(`${otherName} is parent to ${subjectName}`)) return `${mysteryChildRole(subject)} of ${mysteryParentRole(other)}`;
  const subjectAsChildGuardian = mysteryGuardianRoleFromDetail(relationship.detail, subject, other);
  if (subjectAsChildGuardian) {
    if (subjectAsChildGuardian === "mother" || subjectAsChildGuardian === "father") return `${mysteryChildRole(subject)} of ${subjectAsChildGuardian}`;
    if (subjectAsChildGuardian === "aunt" || subjectAsChildGuardian === "uncle") return `${mysterySexedRole(subject, "niece", "nephew")} of ${subjectAsChildGuardian}`;
    if (subjectAsChildGuardian === "older sister" || subjectAsChildGuardian === "older brother") return `${mysterySiblingRole(subject)} of ${subjectAsChildGuardian.replace("older ", "")}`;
  }
  const otherAsChildGuardian = mysteryGuardianRoleFromDetail(relationship.detail, other, subject);
  if (otherAsChildGuardian) {
    if (otherAsChildGuardian === "mother" || otherAsChildGuardian === "father") return `${otherAsChildGuardian} of ${mysteryChildRole(other)}`;
    if (otherAsChildGuardian === "aunt" || otherAsChildGuardian === "uncle") return `${otherAsChildGuardian} of ${mysterySexedRole(other, "niece", "nephew")}`;
    if (otherAsChildGuardian === "older sister" || otherAsChildGuardian === "older brother") return `${mysterySiblingRole(subject)} of ${mysterySiblingRole(other)}`;
  }
  return null;
}

function mysteryFamilyRelationshipSentence(subject: MysteryNpc, other: MysteryNpc, relationship: MysteryNpcRelationship): string {
  const rolePhrase = mysteryFamilyRolePhrase(subject, other, relationship);
  return rolePhrase
    ? `${fullName(subject)} is ${rolePhrase} ${fullName(other)}.`
    : relationship.detail;
}

function mysteryGraphFamilyRolePhrase(subject: MysteryNpc, other: MysteryNpc, graph?: MysteryFamilyGraph): string | null {
  if (!graph) return null;
  const stored = mysteryStoredFamilyRelationLabel(subject, other, graph);
  const label = stored;
  return label ? `${label} of` : null;
}

function mysteryFamilyRelationSentenceForLabel(subject: MysteryNpc, other: MysteryNpc, label: MysteryFamilyRelationLabel): string {
  if (label.includes("'s")) return `${fullName(subject)} is ${fullName(other)}'s ${label}.`;
  return `${fullName(subject)} is ${label} of ${fullName(other)}.`;
}

function refreshMysteryFamilyNotes(npcs: MysteryNpc[], relationships: MysteryNpcRelationship[]) {
  for (const npc of npcs) npc.familyRelationNote = undefined;
  for (const relationship of relationships) {
    if (relationship.kind !== "Family" && relationship.kind !== "Marriage") continue;
    const from = npcs.find((npc) => npc.id === relationship.fromId);
    const to = npcs.find((npc) => npc.id === relationship.toId);
    if (!from || !to) continue;
    if (relationship.kind === "Marriage") {
      addMysteryFamilyNote(from, `Spouse of ${fullName(to)}`);
      addMysteryFamilyNote(to, `Spouse of ${fullName(from)}`);
      continue;
    }
    const fromRole = mysteryFamilyRolePhrase(from, to, relationship);
    const toRole = mysteryFamilyRolePhrase(to, from, relationship);
    if (fromRole) addMysteryFamilyNote(from, `${mysteryTitleCaseRelation(fromRole)} ${fullName(to)}`);
    if (toRole) addMysteryFamilyNote(to, `${mysteryTitleCaseRelation(toRole)} ${fullName(from)}`);
  }
}

function normalizeMysteryNpcRelationships(npcs: MysteryNpc[], relationships: MysteryNpcRelationship[]): MysteryNpcRelationship[] {
  const ids = new Set(npcs.map((npc) => npc.id));
  const byId = new Map(npcs.map((npc) => [npc.id, npc]));
  const seenExact = new Set<string>();
  const officialPartnerNpcIds = new Set<string>();
  let cousinLinks = 0;
  let staffGuestBloodLinks = 0;
  let largeAgeGapRomances = 0;
  const normalized: MysteryNpcRelationship[] = [];
  const orderedRelationships = [...relationships].sort((left, right) =>
    (left.kind === "Marriage" ? 0 : left.kind === "Romance" ? 1 : 2) -
    (right.kind === "Marriage" ? 0 : right.kind === "Romance" ? 1 : 2)
  );
  for (const relationship of orderedRelationships) {
    const from = byId.get(relationship.fromId);
    const to = byId.get(relationship.toId);
    if (!from || !to || !ids.has(from.id) || !ids.has(to.id) || from.id === to.id) continue;
    const exactKey = [relationship.kind, [from.id, to.id].sort().join(":"), relationship.detail].join("|");
    if (seenExact.has(exactKey)) continue;
    if (mysteryIsOfficialPartnerRelationship(relationship.kind)) {
      if (officialPartnerNpcIds.has(from.id) || officialPartnerNpcIds.has(to.id)) continue;
      officialPartnerNpcIds.add(from.id);
      officialPartnerNpcIds.add(to.id);
    }
    if (relationship.kind === "Family" && relationship.detail.toLowerCase().includes("cousin")) {
      if (cousinLinks >= 3) continue;
      cousinLinks += 1;
    }
    if (relationship.kind === "Family" && mysteryIsBloodFamilyDetail(relationship.detail) && mysteryIsStaffGuestPair(from, to)) {
      if (staffGuestBloodLinks >= 1 || !mysteryAllowsStaffGuestBloodFamily(from, to)) continue;
      staffGuestBloodLinks += 1;
    }
    if (mysteryIsRomanticRelationship(relationship.kind) && !mysteryAllowsLargeAgeGapRomance(from, to)) {
      if (largeAgeGapRomances >= 1) continue;
      largeAgeGapRomances += 1;
    }
    seenExact.add(exactKey);
    normalized.push(relationship);
  }
  for (const relationship of normalized) {
    const from = byId.get(relationship.fromId);
    const to = byId.get(relationship.toId);
    if (!from || !to) continue;
    if (relationship.kind === "Marriage") {
      from.familyStatus = "Married";
      to.familyStatus = "Married";
    }
    if (relationship.kind === "Romance") {
      from.familyStatus = "In a relationship";
      to.familyStatus = "In a relationship";
    }
    if (relationship.kind === "Affair" && !officialPartnerNpcIds.has(from.id)) {
      from.familyStatus = "Secretly dating";
    }
    if (relationship.kind === "Affair" && !officialPartnerNpcIds.has(to.id)) {
      to.familyStatus = "Secretly dating";
    }
  }
  refreshMysteryFamilyNotes(npcs, normalized);
  return normalized;
}

function mysteryReasonBase(reason: string): string {
  let base = reason.trim();
  while (/\s*\([^)]*\)\s*$/.test(base)) {
    base = base.replace(/\s*\([^)]*\)\s*$/, "").trim();
  }
  return base;
}

function mysterySetReasonOfStay(npc: MysteryNpc, reasonOfStay: string, sanityLines: string[], note: string) {
  if (npc.reasonOfStay === reasonOfStay) return;
  sanityLines.push(`NPC repair: ${fullName(npc)} reason of stay changed from "${npc.reasonOfStay}" to "${reasonOfStay}"${note ? ` ${note}` : ""}.`);
  npc.reasonOfStay = reasonOfStay;
  const stayHistory = mysteryStayHistoryFor(npc.role, npc.age, npc.reasonOfStay);
  npc.currentStay = stayHistory.currentStay;
  npc.plannedStay = stayHistory.plannedStay;
  npc.previousStay = stayHistory.previousStay;
}

function mysteryPartnerFor(
  npc: MysteryNpc,
  npcs: MysteryNpc[],
  relationships: MysteryNpcRelationship[],
  kinds: MysteryNpcRelationshipKind[]
): MysteryNpc | undefined {
  const validRelationships = mysteryRelationshipsWithSingleSpouses(relationships);
  const link = validRelationships.find((relationship) =>
    kinds.includes(relationship.kind) &&
    (relationship.fromId === npc.id || relationship.toId === npc.id)
  );
  const otherId = link ? (link.fromId === npc.id ? link.toId : link.fromId) : undefined;
  return otherId ? npcs.find((candidate) => candidate.id === otherId) : undefined;
}

function mysteryFallbackReasonForInvalidStay(npc: MysteryNpc): string {
  const options = [
    "Taking a weekend break",
    "Following an anonymous invitation",
    "Reviewing the hotel",
    "Researching a local story"
  ];
  return options[stableHash(`${npc.id}-${npc.reasonOfStay}-fallback-reason`) % options.length];
}

function mysteryCanHaveMediaAttentionReason(npc: Pick<MysteryNpc, "age" | "occupation" | "role">): boolean {
  if (npc.role !== "Guest" || npc.age < 16) return false;
  return /\b(actor|actress|celebrity|heir)\b/i.test(npc.occupation);
}

function mysteryReasonOfStayForGuest(npc: Pick<MysteryNpc, "age" | "occupation" | "role">): string {
  const reasons = mysteryCanHaveMediaAttentionReason(npc)
    ? [...mysteryReasonsOfStay, ...mysteryPublicAttentionReasons]
    : mysteryReasonsOfStay;
  return pick(reasons);
}

function mysteryIsLegalProfessional(npc: MysteryNpc): boolean {
  return /barrister|lawyer|solicitor|judge|legal/i.test(npc.occupation) || /law degree|legal training/i.test(npc.education);
}

function mysteryInheritanceLawyerForDisplay(npc: MysteryNpc, mystery: Pick<MysteryGame, "npcs" | "npcRelationships">): MysteryNpc | undefined {
  const existingLawyerLink = (mystery.npcRelationships ?? []).find((relationship) =>
    relationship.kind === "Work" &&
    relationship.detail.toLowerCase().includes("lawyer") &&
    relationship.detail.toLowerCase().includes("inheritance") &&
    (relationship.fromId === npc.id || relationship.toId === npc.id)
  );
  const existingLawyerId = existingLawyerLink ? (existingLawyerLink.fromId === npc.id ? existingLawyerLink.toId : existingLawyerLink.fromId) : undefined;
  const existingLawyer = existingLawyerId ? mystery.npcs.find((candidate) => candidate.id === existingLawyerId && candidate.id !== npc.id) : undefined;
  return existingLawyer ?? mystery.npcs.find((candidate) => candidate.id !== npc.id && candidate.age >= 18 && mysteryIsLegalProfessional(candidate));
}

function mysteryDisplayReasonOfStay(npc: MysteryNpc, mystery: Pick<MysteryGame, "npcs" | "npcRelationships">): string {
  const baseReason = mysteryReasonBase(npc.reasonOfStay);
  if (baseReason !== "Meeting a lawyer about an inheritance" || /\([^)]*\)/.test(npc.reasonOfStay)) return npc.reasonOfStay;
  const lawyer = mysteryInheritanceLawyerForDisplay(npc, mystery);
  return lawyer ? `${baseReason} (${fullName(lawyer)})` : npc.reasonOfStay;
}

function mysteryDisplayEducation(education: string): string {
  const replacements: Record<string, string> = {
    "Some elementary school": "Primary school certificate",
    "Completed elementary school": "Primary school certificate",
    "Some secondary school": "Secondary school certificate",
    "Secondary school diploma": "High school diploma",
    "Home-schooled through secondary level": "Home-schooled",
    "General education diploma": "High school diploma",
    "Basic literacy training": "No formal education",
    "Basic bookkeeping training": "Basic book-keeping training",
    "Technical college": "Technical college diploma",
    "Architecture degree": "BEng — Bachelor of Engineering",
    "Medical school": "MD — Doctor of Medicine",
    "Medical degree": "MD — Doctor of Medicine"
  };
  return replacements[education] ?? education;
}

function mysteryDisplayOccupation(npc: MysteryNpc): string {
  const replacements: Record<string, string> = {
    "Child guest": "None",
    "Household child": "None",
    Page: "Kitchen helper",
    Archivist: "Author",
    "Art appraiser": "Art dealer",
    Barrister: npc.age >= 55 ? "Retired" : "Junior clerk",
    Bookbinder: "Antique dealer",
    "Stage actress": "Actor",
    "Stage student": "Actor"
  };
  return replacements[npc.occupation] ?? npc.occupation;
}

function mysteryGuestOccupationReplacementFor(npc: MysteryNpc): string {
  const options = ["Shop assistant", "Tour assistant", "Junior clerk", "Student"];
  return options[stableHash(`${npc.id}-${npc.firstName}-${npc.familyName}-guest-occupation-repair`) % options.length];
}

function repairMysteryReasonContext(npcs: MysteryNpc[], relationships: MysteryNpcRelationship[], sanityLines: string[]) {
  const guests = npcs.filter((npc) => npc.role === "Guest");
  const adults = guests.filter((npc) => npc.age >= 18);
  const adultResidents = npcs.filter((npc) => npc.age >= 18);
  const businessOccupations = /accountant|antique|appraiser|art dealer|auctioneer|bank|barrister|bookbinder|boutique|manager|journalist|author|architect|tour guide|doctor/i;
  const hotelFamilyIds = new Set(
    relationships
      .filter((relationship) => relationship.kind === "Family" || relationship.kind === "Marriage")
      .flatMap((relationship) => [relationship.fromId, relationship.toId])
  );
  for (const npc of guests) {
    const baseReason = mysteryReasonBase(npc.reasonOfStay);
    if (baseReason === "Attending a family reunion" && !hotelFamilyIds.has(npc.id)) {
      mysterySetReasonOfStay(npc, "Attending a family reunion (outside of hotel)", sanityLines, "because no family member is staying at Ravenwood");
      continue;
    }

    if (mysteryPublicAttentionReasons.includes(baseReason) && !mysteryCanHaveMediaAttentionReason(npc)) {
      mysterySetReasonOfStay(npc, mysteryFallbackReasonForInvalidStay(npc), sanityLines, "because media attention only fits actors, actresses, celebrities, or heirs");
      continue;
    }

    if (baseReason === "Meeting a business partner") {
      const existingBusinessLink = relationships.find((relationship) =>
        relationship.kind === "Work" &&
        relationship.detail.toLowerCase().includes("business partner") &&
        (relationship.fromId === npc.id || relationship.toId === npc.id)
      );
      const existingPartnerId = existingBusinessLink ? (existingBusinessLink.fromId === npc.id ? existingBusinessLink.toId : existingBusinessLink.fromId) : undefined;
      const existingPartner = existingPartnerId ? npcs.find((candidate) => candidate.id === existingPartnerId) : undefined;
      const partner = existingPartner ?? pick(
        adults.filter((candidate) => candidate.id !== npc.id && businessOccupations.test(candidate.occupation)).length > 0
          ? adults.filter((candidate) => candidate.id !== npc.id && businessOccupations.test(candidate.occupation))
          : adults.filter((candidate) => candidate.id !== npc.id)
      );
      if (partner) {
        addMysteryNpcRelationship(
          relationships,
          npc,
          partner,
          "Work",
          `${fullName(npc)} came to Ravenwood to meet business partner ${fullName(partner)}.`,
          { hidden: true, trustImpact: 3, motiveRisk: 4, skipGuards: true }
        );
        mysterySetReasonOfStay(npc, `${baseReason} (${fullName(partner)})`, sanityLines, "so the business partner exists in the mansion");
      }
    }

    if (baseReason === "Meeting a lawyer about an inheritance") {
      const legalAdults = adultResidents.filter((candidate) => candidate.id !== npc.id && mysteryIsLegalProfessional(candidate));
      const fallbackAdults = [
        ...adults.filter((candidate) => candidate.id !== npc.id),
        ...adultResidents.filter((candidate) => candidate.id !== npc.id && candidate.role !== "Guest")
      ];
      const existingLawyer = mysteryInheritanceLawyerForDisplay(npc, { npcs, npcRelationships: relationships });
      const lawyer = existingLawyer ?? (legalAdults.length > 0 ? pick(legalAdults) : fallbackAdults.length > 0 ? pick(fallbackAdults) : undefined);
      if (lawyer) {
        if (lawyer.occupation !== "Lawyer") {
          const oldOccupation = lawyer.occupation;
          lawyer.occupation = "Lawyer";
          sanityLines.push(`NPC repair: ${fullName(lawyer)} occupation changed from ${oldOccupation} to Lawyer so the named inheritance lawyer is actually a lawyer.`);
        }
        if (!/law degree|llb|llm|legal training/i.test(lawyer.education)) {
          const oldEducation = lawyer.education;
          lawyer.education = "Law degree";
          sanityLines.push(`NPC repair: ${fullName(lawyer)} education changed from ${oldEducation} to Law degree so the named inheritance lawyer is actually a lawyer.`);
        }
        addMysteryNpcRelationship(
          relationships,
          npc,
          lawyer,
          "Work",
          `${fullName(npc)} came to Ravenwood to meet lawyer ${fullName(lawyer)} about an inheritance.`,
          { hidden: true, trustImpact: 3, motiveRisk: 5, skipGuards: true }
        );
        mysterySetReasonOfStay(npc, `${baseReason} (${fullName(lawyer)})`, sanityLines, "so the inheritance lawyer exists in the mansion");
      }
    }

    if (baseReason === "Taking a romantic getaway" || baseReason === "Meeting a secret romantic partner") {
      const partner = mysteryPartnerFor(npc, npcs, relationships, ["Marriage", "Romance", "Affair"]);
      mysterySetReasonOfStay(npc, `${baseReason} (${partner ? `with ${fullName(partner)}` : "alone"})`, sanityLines, "so the romantic stay is explicit");
    }

    if (baseReason === "Attending an engagement party") {
      if (/\([^)]*\)/.test(npc.reasonOfStay)) continue;
      const engagedGuest = adults.find((candidate) => /\bengaged\b/i.test(candidate.familyStatus) && !/secret/i.test(candidate.familyStatus));
      const partner = engagedGuest ? mysteryPartnerFor(engagedGuest, npcs, relationships, ["Romance", "Marriage"]) : undefined;
      const partyLabel = engagedGuest && partner
        ? `for ${fullName(engagedGuest)} and ${fullName(partner)}`
        : "outside of mansion";
      mysterySetReasonOfStay(npc, `${baseReason} (${partyLabel})`, sanityLines, "so the engagement party has a clear host");
    }

    if (baseReason === "Attending a wedding") {
      if (/\([^)]*\)/.test(npc.reasonOfStay)) continue;
      const wedding = mysteryRelationshipsWithSingleSpouses(relationships)
        .find((relationship) =>
          relationship.kind === "Marriage" &&
          guests.some((candidate) => candidate.id === relationship.fromId) &&
          guests.some((candidate) => candidate.id === relationship.toId)
        );
      const left = wedding ? npcs.find((candidate) => candidate.id === wedding.fromId) : undefined;
      const right = wedding ? npcs.find((candidate) => candidate.id === wedding.toId) : undefined;
      const weddingLabel = left && right ? `for ${fullName(left)} and ${fullName(right)}` : "outside of mansion";
      mysterySetReasonOfStay(npc, `${baseReason} (${weddingLabel})`, sanityLines, "so the wedding has a clear couple");
    }

    if (baseReason === "Celebrating an anniversary") {
      const partner = mysteryPartnerFor(npc, npcs, relationships, ["Marriage", "Romance"]);
      if (partner) {
        mysterySetReasonOfStay(npc, `${baseReason} (with ${fullName(partner)})`, sanityLines, "so the anniversary companion is present");
      } else {
        mysterySetReasonOfStay(npc, mysteryFallbackReasonForInvalidStay(npc), sanityLines, "because they had no spouse or partner travelling with them");
      }
    }
  }
}

function mysteryFamilyGroupReason(group: MysteryNpc[], relationships: MysteryNpcRelationship[]): string {
  const groupIds = new Set(group.map((member) => member.id));
  const groupLinks = relationships.filter((relationship) => groupIds.has(relationship.fromId) && groupIds.has(relationship.toId));
  const hasChild = group.some((member) => member.age < 18);
  const hasParentChild = groupLinks.some((relationship) => {
    if (relationship.kind !== "Family") return false;
    const left = group.find((member) => member.id === relationship.fromId);
    const right = group.find((member) => member.id === relationship.toId);
    if (!left || !right) return false;
    const leftRole = mysteryFamilyRolePhrase(left, right, relationship);
    const rightRole = mysteryFamilyRolePhrase(right, left, relationship);
    return Boolean(leftRole?.match(/\b(mother|father)\b/) || rightRole?.match(/\b(mother|father)\b/));
  });
  const marriage = groupLinks.find((relationship) => relationship.kind === "Marriage");
  const hasMarriedParentsWithChild = Boolean(marriage && hasChild && hasParentChild);
  if (hasMarriedParentsWithChild) {
    const familyTripReasons = ["Taking a summer vacation", "Taking a weekend break", "Visiting a relative", "Meeting a lawyer about an inheritance"];
    const seed = group.map((member) => member.id).sort().join("-");
    return familyTripReasons[stableHash(`${seed}-married-family-trip`) % familyTripReasons.length];
  }
  const visibleEngagement = groupLinks.find((relationship) => {
    if (relationship.hidden || !["Romance", "Marriage"].includes(relationship.kind)) return false;
    const left = group.find((member) => member.id === relationship.fromId);
    const right = group.find((member) => member.id === relationship.toId);
    return Boolean(left && right && [left, right].some((member) => /\bengaged\b/i.test(member.familyStatus) && !/secret/i.test(member.familyStatus)));
  });
  if (visibleEngagement) {
    const left = group.find((member) => member.id === visibleEngagement.fromId);
    const right = group.find((member) => member.id === visibleEngagement.toId);
    if (left && right) return `Attending an engagement party (for ${fullName(left)} and ${fullName(right)})`;
  }

  const widowedParent = group.find((member) => member.age >= 45 && /widowed/i.test(member.familyStatus) && groupLinks.some((relationship) => {
    if (relationship.kind !== "Family") return false;
    const other = group.find((candidate) => candidate.id === (relationship.fromId === member.id ? relationship.toId : relationship.toId === member.id ? relationship.fromId : ""));
    if (!other) return false;
    return mysteryFamilyRolePhrase(member, other, relationship)?.includes("mother") || mysteryFamilyRolePhrase(member, other, relationship)?.includes("father");
  }));
  if (widowedParent) return `Attending a funeral service (for ${fullName(widowedParent)}'s late spouse)`;

  if (marriage && group.length === 2) return "On their honeymoon";
  if (marriage && group.length >= 3) {
    const left = group.find((member) => member.id === marriage.fromId);
    const right = group.find((member) => member.id === marriage.toId);
    if (left && right) return `Attending a wedding (for ${fullName(left)} and ${fullName(right)})`;
  }

  if (hasParentChild && hasChild) return "Taking a summer vacation";
  if (group.length >= 4) return "Attending a family reunion";
  if (hasParentChild) return "Taking a weekend break";
  return "Visiting a relative";
}

function repairMysteryNpcSecretContinuity(npc: MysteryNpc): string | null {
  if (!/has been stealing small amounts of money from the hotel/i.test(npc.secret)) return null;
  if (mysteryHasExtendedRavenwoodOpportunity(npc)) return null;
  npc.secret = "Took a small amount of money from the hotel and plans to put it back.";
  return `NPC repair: ${fullName(npc)} hotel-theft secret was changed to a one-off theft because their Ravenwood stay is too short.`;
}

function repairMysteryRelationshipContinuity(relationship: MysteryNpcRelationship, npcs: MysteryNpc[]): string | null {
  const from = npcs.find((npc) => npc.id === relationship.fromId);
  const to = npcs.find((npc) => npc.id === relationship.toId);
  if (!from || !to) return null;

  const guests = [from, to].filter((npc) => npc.role === "Guest");
  const hasShortFirstStayGuest = guests.some((npc) => !mysteryHasExtendedRavenwoodOpportunity(npc));
  if (!hasShortFirstStayGuest) return null;

  const detail = relationship.detail;
  if (/became romantically involved during (an earlier ravenwood stay|private time at ravenwood)/i.test(detail)) {
    relationship.detail = `${fullName(from)} and ${fullName(to)} arrived at Ravenwood already romantically involved and disagree about whether to make it public now.`;
    return `NPC repair: ${fullName(from)} and ${fullName(to)} romance history no longer contradicts a first Ravenwood stay.`;
  }
  if (/became romantically involved through repeated private service at ravenwood/i.test(detail)) {
    relationship.detail = `${fullName(from)} and ${fullName(to)} are romantically involved and have been meeting away from the public rooms at Ravenwood.`;
    return `NPC repair: ${fullName(from)} and ${fullName(to)} service romance no longer implies repeated Ravenwood visits.`;
  }
  if (/became friendly through repeated ravenwood visits/i.test(detail)) {
    relationship.detail = `${fullName(from)} and ${fullName(to)} trust each other more than most people in the house.`;
    return `NPC repair: ${fullName(from)} and ${fullName(to)} friendship history no longer implies repeated Ravenwood visits.`;
  }
  if (/became close during (an earlier ravenwood stay|their time around ravenwood)/i.test(detail)) {
    relationship.detail = `${fullName(from)} and ${fullName(to)} trust each other more than most people at Ravenwood.`;
    return `NPC repair: ${fullName(from)} and ${fullName(to)} friendship history no longer contradicts a first Ravenwood stay.`;
  }
  return null;
}

function repairMysteryNpcPortraitUniqueness(npcs: MysteryNpc[], reservedSubjects: PortraitSubject[] = []): string[] {
  const sanityLines: string[] = [];
  const usedPortraitKeys = new Set<string>();
  const usedPortraitSignatures = new Set<string>();
  for (const subject of reservedSubjects) {
    const portrait = subject.ravenwoodPortraitKey ? ravenwoodPortraitByKey[subject.ravenwoodPortraitKey] : undefined;
    markRavenwoodPortraitUsed(portrait, usedPortraitKeys, usedPortraitSignatures);
  }

  for (const npc of npcs) {
    const existingPortrait = npc.ravenwoodPortraitKey ? ravenwoodPortraitByKey[npc.ravenwoodPortraitKey] : undefined;
    const existingSignature = existingPortrait ? ravenwoodPortraitSignature(existingPortrait) : undefined;
    const alreadyUsed = Boolean(
      existingPortrait &&
      (usedPortraitKeys.has(existingPortrait.key) || (existingSignature && usedPortraitSignatures.has(existingSignature)))
    );

    if (existingPortrait && !alreadyUsed) {
      markRavenwoodPortraitUsed(existingPortrait, usedPortraitKeys, usedPortraitSignatures);
      continue;
    }

    const replacement = npc.role === "Staff"
      ? chooseRavenwoodStaffPortrait({
        sex: npc.sex,
        age: npc.age,
        usedPortraitKeys,
        usedPortraitSignatures,
        visualRace: npc.visualRace
      })
      : chooseRavenwoodGuestPortrait({
        sex: npc.sex,
        age: npc.age,
        usedPortraitKeys,
        usedPortraitSignatures,
        visualRace: npc.visualRace
      });
    if (!replacement) continue;
    npc.ravenwoodPortraitKey = replacement.key;
    npc.portraitLineage = replacement.lineage;
    npc.visualRace = replacement.visualRace;
    sanityLines.push(`NPC repair: ${fullName(npc)} received a unique portrait because another resident already used the same portrait.`);
  }

  return sanityLines;
}

function repairMysteryNpcProfileConsistency(npcs: MysteryNpc[], relationships: MysteryNpcRelationship[], reservedPortraitSubjects: PortraitSubject[] = []): string[] {
  const sanityLines: string[] = [];
  for (const npc of npcs) {
    if (npc.isChild || npc.age < 14) {
      npc.isChild = true;
      if (npc.substancePreference !== "none" || npc.substanceState !== "sober" || npc.substanceTurns !== 0 || npc.temporaryTrust !== 0) {
        npc.substancePreference = "none";
        npc.substanceState = "sober";
        npc.substanceTurns = 0;
        npc.temporaryTrust = 0;
        sanityLines.push(`NPC repair: ${fullName(npc)} child substance fields were cleared.`);
      }
    }
    if (npc.age < 40 && /widowed/i.test(npc.familyStatus) && !mysteryKeepsRareYoungWidowedStatus(npc)) {
      const replacement = mysteryReplacementForYoungWidowedStatus(npc);
      sanityLines.push(`NPC repair: ${fullName(npc)} family status changed from "${npc.familyStatus}" to "${replacement}" because widowed residents under 40 should be rare.`);
      npc.familyStatus = replacement;
    }
    const resolvedSecret = mysteryResolveNpcSecretPlaceholders(npc.secret, npc, npcs);
    if (resolvedSecret !== npc.secret) {
      sanityLines.push(`NPC repair: ${fullName(npc)} secret placeholders were resolved to actual resident names.`);
      npc.secret = resolvedSecret;
    }
    const secretRepairLine = repairMysteryNpcSecretContinuity(npc);
    if (secretRepairLine) sanityLines.push(secretRepairLine);
  }
  for (const relationship of relationships) {
    const relationshipRepairLine = repairMysteryRelationshipContinuity(relationship, npcs);
    if (relationshipRepairLine) sanityLines.push(relationshipRepairLine);
  }
  sanityLines.push(...repairMysteryNpcPortraitUniqueness(npcs, reservedPortraitSubjects));
  const guestFamilyLinks = relationships.filter((relationship) => {
    if (relationship.kind !== "Family" && relationship.kind !== "Marriage") return false;
    const from = npcs.find((npc) => npc.id === relationship.fromId);
    const to = npcs.find((npc) => npc.id === relationship.toId);
    return Boolean(from && to && from.role === "Guest" && to.role === "Guest");
  });
  const guestById = new Map(npcs.filter((npc) => npc.role === "Guest").map((npc) => [npc.id, npc]));
  const visited = new Set<string>();
  for (const npc of guestById.values()) {
    if (visited.has(npc.id)) continue;
    const groupIds = new Set<string>([npc.id]);
    const pending = [npc.id];
    visited.add(npc.id);
    while (pending.length > 0) {
      const currentId = pending.shift()!;
      for (const link of guestFamilyLinks) {
        const nextId = link.fromId === currentId ? link.toId : link.toId === currentId ? link.fromId : null;
        if (!nextId || !guestById.has(nextId) || visited.has(nextId)) continue;
        visited.add(nextId);
        groupIds.add(nextId);
        pending.push(nextId);
      }
    }
    if (groupIds.size <= 1) continue;
    const group = Array.from(groupIds).map((id) => guestById.get(id)).filter((item): item is MysteryNpc => Boolean(item));
    const familyReason = mysteryFamilyGroupReason(group, relationships);
    for (const member of group) {
      if (member.reasonOfStay !== familyReason) {
        mysterySetReasonOfStay(member, familyReason, sanityLines, "to match their family group");
      }
    }
  }
  repairMysteryReasonContext(npcs, relationships, sanityLines);

  const requiredEducation: Record<string, string[]> = {
    Doctor: ["MD — Doctor of Medicine", "PhD in Medicine", "First aid training"],
    Nurse: ["First aid training", "Medical secretary training"],
    Lawyer: ["Law degree", "LLB — Bachelor of Laws", "Legal training"],
    Architect: ["BEng — Bachelor of Engineering", "MEng — Master of Engineering", "Technical college diploma"],
    Accountant: ["Basic book-keeping training", "Office administration training"],
    "Bank manager": ["Basic book-keeping training", "Office administration training", "MBA — Master of Business Administration"],
    "Security guard": ["Security guard training", "Police academy training"]
  };
  for (const npc of npcs) {
    if (npc.role === "Guest" && (npc.occupation === "Receptionist" || npc.occupation === "Companion in training")) {
      const oldOccupation = npc.occupation;
      const replacement = mysteryGuestOccupationReplacementFor(npc);
      sanityLines.push(`NPC repair: ${fullName(npc)} guest occupation changed from "${oldOccupation}" to "${replacement}".`);
      npc.occupation = replacement;
    }
    const required = requiredEducation[npc.occupation];
    if (!required || required.includes(npc.education)) continue;
    const replacement = required[stableHash(`${npc.id}-${npc.occupation}-education-repair`) % required.length];
    sanityLines.push(`NPC repair: ${fullName(npc)} education changed from "${npc.education}" to "${replacement}" for occupation "${npc.occupation}".`);
    npc.education = replacement;
  }
  return sanityLines;
}

function repairMysteryFindablePlayerFacingTruth(findables: MysteryFindable[]): string[] {
  const sanityLines: string[] = [];
  for (const findable of findables) {
    const beforeName = findable.playerName;
    const beforeDescription = findable.playerDescription;
    const repaired = mysteryWithPlayerFacingFindableText(findable);
    findable.playerName = repaired.playerName;
    findable.playerDescription = repaired.playerDescription;
    const playerText = `${findable.playerName ?? ""} ${findable.playerDescription ?? ""}`;
    if (/\b(search roll|not yet knowable|won't tell the player|will not tell the player|unless trust|actual murder|murder proof|proving|no staff exists|the host explains)\b/i.test(playerText)) {
      findable.playerName = mysteryStripPlayerHiddenFindableMeta(findable.playerName ?? findable.name);
      findable.playerDescription = mysteryStripPlayerHiddenFindableMeta(findable.playerDescription ?? findable.description);
      sanityLines.push(`Player-facing repair: hidden generator wording was stripped from item "${findable.name}".`);
    } else if (beforeName !== findable.playerName || beforeDescription !== findable.playerDescription) {
      sanityLines.push(`Player-facing repair: display text prepared for item "${findable.name}".`);
    }
  }
  return sanityLines;
}

function mysteryRelationshipImportanceScore(relationship: MysteryNpcRelationship): number {
  const kindScore: Record<MysteryNpcRelationshipKind, number> = {
    Family: 100,
    Marriage: 100,
    Romance: 86,
    Affair: 84,
    Witness: 82,
    Work: 72,
    Blackmail: 68,
    Debt: 62,
    Rivalry: 58,
    Protection: 38,
    Friendship: 34,
    Suspicion: 30
  };
  return kindScore[relationship.kind] + relationship.motiveRisk * 4 + Math.abs(relationship.trustImpact);
}

function repairMysteryRelationshipSignalToNoise(mystery: Pick<MysteryGame, "npcs" | "npcRelationships" | "murders">): string[] {
  const sanityLines: string[] = [];
  const relationships = mystery.npcRelationships ?? [];
  const murderPairKeys = new Set((mystery.murders ?? []).map((murder) => mysteryGraphPairKey(murder.killerId, murder.victimId)));
  const protectedKinds = new Set<MysteryNpcRelationshipKind>(["Family", "Marriage", "Romance", "Affair", "Witness", "Work", "Blackmail", "Debt", "Rivalry"]);
  const socialKinds = new Set<MysteryNpcRelationshipKind>(["Friendship", "Protection", "Suspicion"]);
  const protectedRelationship = (relationship: MysteryNpcRelationship) =>
    protectedKinds.has(relationship.kind) ||
    relationship.motiveRisk >= 8 ||
    murderPairKeys.has(mysteryGraphPairKey(relationship.fromId, relationship.toId));

  const socialLinks = relationships
    .filter((relationship) => socialKinds.has(relationship.kind) && !protectedRelationship(relationship))
    .sort((left, right) => mysteryRelationshipImportanceScore(right) - mysteryRelationshipImportanceScore(left));
  const maxSocialLinks = clamp(Math.floor(mystery.npcs.length * 0.38), 4, 7);
  const keptSocialIds = new Set(socialLinks.slice(0, maxSocialLinks).map((relationship) => relationship.id));
  const removedDetails: string[] = [];
  for (let index = relationships.length - 1; index >= 0; index -= 1) {
    const relationship = relationships[index];
    if (!socialKinds.has(relationship.kind) || protectedRelationship(relationship) || keptSocialIds.has(relationship.id)) continue;
    relationships.splice(index, 1);
    removedDetails.push(relationship.kind);
  }
  if (removedDetails.length > 0) {
    sanityLines.push(`Relationship repair: removed ${removedDetails.length} low-signal social links so the resident web stays readable.`);
  }

  const hiddenLowSignal = relationships
    .filter((relationship) => relationship.hidden && relationship.motiveRisk <= 4 && !protectedRelationship(relationship))
    .sort((left, right) => mysteryRelationshipImportanceScore(right) - mysteryRelationshipImportanceScore(left));
  const maxHiddenLowSignal = clamp(Math.floor(mystery.npcs.length * 0.18), 2, 4);
  const keptHiddenIds = new Set(hiddenLowSignal.slice(0, maxHiddenLowSignal).map((relationship) => relationship.id));
  let removedHidden = 0;
  for (let index = relationships.length - 1; index >= 0; index -= 1) {
    const relationship = relationships[index];
    if (!relationship.hidden || relationship.motiveRisk > 4 || protectedRelationship(relationship) || keptHiddenIds.has(relationship.id)) continue;
    relationships.splice(index, 1);
    removedHidden += 1;
  }
  if (removedHidden > 0) {
    sanityLines.push(`Relationship repair: removed ${removedHidden} hidden low-stakes links so secrets feel more intentional.`);
  }

  let pacedHidden = 0;
  for (const relationship of relationships) {
    if (!relationship.hidden || relationship.kind === "Witness" || relationship.motiveRisk < 8 || relationship.availableDay || relationship.availableDaytime) continue;
    relationship.availableDay = 1;
    relationship.availableDaytime = "Afternoon";
    pacedHidden += 1;
  }
  if (pacedHidden > 0) {
    sanityLines.push(`Information pacing: delayed ${pacedHidden} high-stakes hidden relationships until Day 1 Afternoon instead of surfacing them immediately.`);
  }

  return sanityLines;
}

function auditMysteryConsistencyBeforeGameplay(mystery: Pick<MysteryGame, "npcs" | "npcRelationships" | "murders" | "findables" | "familyGraph">): string[] {
  const sanityLines: string[] = [];
  const npcIds = new Set(mystery.npcs.map((npc) => npc.id));
  const familyGraph = mystery.familyGraph ?? emptyMysteryFamilyGraph();
  const missingGraphIds = [
    ...(familyGraph.links ?? []).flatMap((relation) => [relation.subjectId, relation.otherId])
  ].filter((id) => !npcIds.has(id));
  if (missingGraphIds.length > 0) {
    sanityLines.push(`Pre-game consistency warning: family graph still references ${new Set(missingGraphIds).size} missing residents.`);
  }

  const adultFamilyIds = new Set(
    mystery.npcRelationships
      .filter((relationship) => relationship.kind === "Family" || relationship.kind === "Marriage")
      .flatMap((relationship) => {
        const from = mystery.npcs.find((npc) => npc.id === relationship.fromId);
        const to = mystery.npcs.find((npc) => npc.id === relationship.toId);
        return from && to && (from.age >= 18 || to.age >= 18) ? [from.id, to.id] : [];
      })
  );
  const isolatedChildren = mystery.npcs.filter((npc) => npc.role === "Guest" && npc.age < 18 && !adultFamilyIds.has(npc.id));
  if (isolatedChildren.length > 0) {
    sanityLines.push(`Pre-game consistency warning: ${isolatedChildren.length} child guest(s) still lack an adult family link.`);
  }

  const murderClueRoles = new Map<number, Set<MysteryClueRole>>();
  for (const findable of mystery.findables ?? []) {
    if (findable.relatedMurderIndex === undefined || !findable.clueRole) continue;
    if (!murderClueRoles.has(findable.relatedMurderIndex)) murderClueRoles.set(findable.relatedMurderIndex, new Set());
    murderClueRoles.get(findable.relatedMurderIndex)!.add(findable.clueRole);
  }
  mystery.murders.forEach((murder, index) => {
    if (!npcIds.has(murder.killerId) || !npcIds.has(murder.victimId)) {
      sanityLines.push(`Pre-game consistency warning: murder ${index + 1} references a missing killer or victim.`);
    }
    const roles = murderClueRoles.get(index);
    if (!roles?.has("Motive") || !roles.has("Method")) {
      sanityLines.push(`Pre-game consistency warning: murder ${index + 1} is still missing a motive or method clue after repair.`);
    }
  });

  return sanityLines;
}

function repairMysteryClueChainQuality(mystery: Pick<MysteryGame, "murders" | "npcs" | "rooms" | "findables">): string[] {
  const sanityLines: string[] = [];
  const findables = mystery.findables ?? [];
  mystery.murders.forEach((murder, index) => {
    const killer = mystery.npcs.find((npc) => npc.id === murder.killerId);
    const victim = mystery.npcs.find((npc) => npc.id === murder.victimId);
    if (!killer || !victim) return;
    const related = findables.filter((findable) => findable.relatedMurderIndex === index);
    const hasRole = (role: MysteryClueRole) =>
      findables.some((findable) => findable.clueRole === role && (findable.relatedMurderIndex === index || findable.falseLeadForMurderIndex === index));

    if (!hasRole("Motive")) {
      const motiveLike = related.find((findable) => findable.kind === "Proof" && !findable.clueRole && /\b(motive|debt|money|inheritance|will|blackmail|relationship|affair|forged|identity|brib|stolen|secret)\b/i.test(`${findable.name} ${findable.description}`));
      if (motiveLike) {
        motiveLike.clueRole = "Motive";
      } else {
        const motiveProof = mysteryPreciseMotiveProof(murder.motive, killer, victim);
        findables.push({
          id: uid(),
          kind: "Proof",
          origin: "Crime",
          name: motiveProof.name,
          description: motiveProof.description,
          roomId: killer.roomId,
          holderNpcId: killer.id,
          availableDay: 1,
          availableDaytime: "Morning",
          relatedMurderIndex: index,
          clueRole: "Motive",
          proofText: motiveProof.description,
          searchDifficulty: motiveProof.searchDifficulty
        });
      }
      sanityLines.push(`Clue chain repair: motive clue ensured for murder ${index + 1}.`);
    }

    if (!hasRole("Method")) {
      const methodLike = related.find((findable) => findable.kind === "Proof" && !findable.clueRole);
      if (methodLike) {
        methodLike.clueRole = "Method";
      } else {
        const roomName = mystery.rooms.find((room) => room.id === murder.roomId)?.name ?? "the murder room";
        const methodProof = mysteryPreciseMethodProof(murder.method, killer, victim, roomName);
        findables.push({
          id: uid(),
          kind: "Proof",
          origin: "Crime",
          name: methodProof.name,
          description: methodProof.description,
          roomId: murder.roomId,
          availableDay: murder.day,
          availableDaytime: murder.daytime,
          relatedMurderIndex: index,
          clueRole: "Method",
          proofText: methodProof.description,
          searchDifficulty: methodProof.searchDifficulty
        });
      }
      sanityLines.push(`Clue chain repair: method clue ensured for murder ${index + 1}.`);
    }

    if (!hasRole("Witness")) {
      const witnessFindable = mysteryWitnessFindableForMurder(murder, index, mystery.npcs, mystery.rooms);
      if (witnessFindable) {
        findables.push(witnessFindable);
        sanityLines.push(`Clue chain repair: witness clue ensured for murder ${index + 1}.`);
      }
    }

    if (!hasRole("FalseLead")) {
      const falseLead = mysteryFalseLeadFindableForMurder(murder, index, mystery.npcs, mystery.rooms);
      if (falseLead) {
        findables.push(falseLead);
        sanityLines.push(`Clue chain repair: false lead ensured for murder ${index + 1}.`);
      }
    }
  });

  for (const findable of findables) {
    const playerText = `${findable.playerName ?? findable.name} ${findable.playerDescription ?? findable.description}`;
    if (findable.clueRole && playerText.trim().length < 18) {
      findable.playerDescription = mysteryStripPlayerHiddenFindableMeta(findable.description);
      sanityLines.push(`Clue chain repair: readable player text refreshed for "${findable.name}".`);
    }
    if (findable.clueRole && /\b(actual killer|actual murder|this proves|murder proof|search roll|unless trust|not yet knowable)\b/i.test(playerText)) {
      const repaired = mysteryWithPlayerFacingFindableText(findable);
      findable.playerName = repaired.playerName;
      findable.playerDescription = repaired.playerDescription;
      sanityLines.push(`Clue chain repair: spoilery wording removed from "${findable.name}".`);
    }
  }

  return sanityLines;
}

function repairMysteryRoomOccupantLists(rooms: MysteryRoom[], npcs: MysteryNpc[], playerRoomId: string): string[] {
  const sanityLines: string[] = [];
  const expected = new Map(rooms.map((room) => [room.id, new Set<string>()]));
  expected.get(playerRoomId)?.add("player");
  for (const npc of npcs) {
    const roomId = npc.role === "Guest" ? npc.roomId : npc.stationRoomId;
    expected.get(roomId)?.add(npc.id);
  }
  for (const room of rooms) {
    const nextOccupants = Array.from(expected.get(room.id) ?? []);
    const before = [...room.occupantIds].sort().join("|");
    const after = [...nextOccupants].sort().join("|");
    if (before !== after) {
      room.occupantIds = nextOccupants;
      sanityLines.push(`Room repair: occupant list rebuilt for ${room.name}.`);
    }
  }
  return sanityLines;
}

function validateAndRepairMysteryBeforeStart(mystery: MysteryGame, preflightLines: string[] = []): MysteryGame {
  const sanityLines = [...preflightLines];
  const familyGraph = mystery.familyGraph ?? emptyMysteryFamilyGraph();
  const reservedPortraits: PortraitSubject[] = [mystery.player];

  mystery.npcRelationships = normalizeMysteryNpcRelationships(mystery.npcs, mystery.npcRelationships ?? []);
  sanityLines.push(...repairMysteryFamilyGraphConsistency(mystery.npcs, mystery.npcRelationships, familyGraph));
  mystery.npcRelationships = normalizeMysteryNpcRelationships(mystery.npcs, mystery.npcRelationships ?? []);
  sanityLines.push(...repairMysteryNpcProfileConsistency(mystery.npcs, mystery.npcRelationships, reservedPortraits));
  sanityLines.push(...repairMysteryRelationshipSignalToNoise(mystery));
  mystery.npcRelationships = normalizeMysteryNpcRelationships(mystery.npcs, mystery.npcRelationships ?? []);
  sanityLines.push(...repairMysteryMurderTimelineAndMotives(mystery.murders, mystery.npcs, mystery.npcRelationships));
  mystery.npcRelationships = normalizeMysteryNpcRelationships(mystery.npcs, mystery.npcRelationships ?? []);
  sanityLines.push(...repairMysteryClueChainQuality(mystery));
  sanityLines.push(...repairMysteryFindablePlayerFacingTruth(mystery.findables ?? []));
  sanityLines.push(...repairMysteryRoomOccupantLists(mystery.rooms, mystery.npcs, mystery.playerRoomId));
  sanityLines.push(...auditMysteryConsistencyBeforeGameplay({ ...mystery, familyGraph }));

  if (!mystery.npcs.some((npc) => npc.role === "Staff")) {
    sanityLines.push("Pre-game validation warning: no staff member was generated.");
  }
  const leakedItem = (mystery.findables ?? []).find((findable) =>
    /\b(search roll|not yet knowable|won't tell the player|will not tell the player|unless trust|actual murder|murder proof|proving)\b/i.test(`${findable.playerName ?? ""} ${findable.playerDescription ?? ""}`)
  );
  if (leakedItem) {
    sanityLines.push(`Pre-game validation warning: player-facing item text may still expose internal wording for "${leakedItem.name}".`);
  }

  const cleanMystery = cleanMysteryNameEncoding({ ...mystery, familyGraph });
  return {
    ...cleanMystery,
    sanityLedger: [...buildMysterySanityLedger(cleanMystery), ...sanityLines].slice(-600)
  };
}

function mysterySharedHistoryContext(a: MysteryNpc, b: MysteryNpc): "staff" | "guest" | "mixed" {
  if (a.role === "Staff" && b.role === "Staff") return "staff";
  if (a.role === "Guest" && b.role === "Guest") return "guest";
  return "mixed";
}

function mysteryRomanceHistoryDetail(from: MysteryNpc, to: MysteryNpc): string {
  const context = mysterySharedHistoryContext(from, to);
  if (context === "staff") {
    return pick([
      `${fullName(from)} and ${fullName(to)} became romantically involved during late staff shifts and disagree about whether to make it public now.`,
      `${fullName(from)} has been meeting ${fullName(to)} in private after service, which could ruin more than one position.`
    ]);
  }
  if (context === "mixed") {
    const guest = from.role === "Guest" ? from : to.role === "Guest" ? to : undefined;
    if (guest && !mysteryHasExtendedRavenwoodOpportunity(guest)) {
      return pick([
        `${fullName(from)} and ${fullName(to)} are romantically involved and have been meeting away from the public rooms at Ravenwood.`,
        `${fullName(from)} and ${fullName(to)} arrived at Ravenwood with a private attachment that could ruin more than one reputation.`
      ]);
    }
    return pick([
      `${fullName(from)} and ${fullName(to)} became romantically involved through repeated private service at Ravenwood and disagree about whether to make it public now.`,
      `${fullName(from)} has been meeting ${fullName(to)} away from the public rooms, which could ruin more than one reputation.`
    ]);
  }
  if (!mysteryHasExtendedRavenwoodOpportunity(from) || !mysteryHasExtendedRavenwoodOpportunity(to)) {
    return pick([
      `${fullName(from)} and ${fullName(to)} arrived at Ravenwood already romantically involved and disagree about whether to make it public now.`,
      `${fullName(from)} and ${fullName(to)} have been drawn together privately since arriving at Ravenwood.`
    ]);
  }
  return pick([
    `${fullName(from)} and ${fullName(to)} became romantically involved during private time at Ravenwood and disagree about whether to make it public now.`,
    `${fullName(from)} has been meeting ${fullName(to)} in private around Ravenwood, which could ruin more than one reputation.`
  ]);
}

function mysteryFriendshipDetail(from: MysteryNpc, to: MysteryNpc): string {
  const context = mysterySharedHistoryContext(from, to);
  if (context === "staff") {
    return pick([
      `${fullName(from)} and ${fullName(to)} built a good friendship while working at Ravenwood and still trust each other more than most people in the house.`,
      `${fullName(from)} quietly looks out for ${fullName(to)} because their staff friendship has survived several difficult shifts.`,
      `${fullName(from)} and ${fullName(to)} defend each other when gossip begins.`
    ]);
  }
  if (context === "mixed") {
    const guest = from.role === "Guest" ? from : to.role === "Guest" ? to : undefined;
    if (guest && !mysteryHasExtendedRavenwoodOpportunity(guest)) {
      return pick([
        `${fullName(from)} and ${fullName(to)} trust each other more than most people in the house.`,
        `${fullName(from)} quietly looks out for ${fullName(to)} because their friendship crosses the staff-guest divide.`,
        `${fullName(from)} and ${fullName(to)} defend each other when gossip begins.`
      ]);
    }
    return pick([
      `${fullName(from)} and ${fullName(to)} became friendly through repeated Ravenwood visits and still trust each other more than most people in the house.`,
      `${fullName(from)} quietly looks out for ${fullName(to)} because their friendship crosses the staff-guest divide.`,
      `${fullName(from)} and ${fullName(to)} defend each other when gossip begins.`
    ]);
  }
  if (!mysteryHasExtendedRavenwoodOpportunity(from) || !mysteryHasExtendedRavenwoodOpportunity(to)) {
    return pick([
      `${fullName(from)} and ${fullName(to)} trust each other more than most people at Ravenwood.`,
      `${fullName(from)} quietly looks out for ${fullName(to)}.`,
      `${fullName(from)} and ${fullName(to)} defend each other when gossip begins.`
    ]);
  }
  return pick([
    `${fullName(from)} and ${fullName(to)} share an old friendship and still trust each other more than most people at Ravenwood.`,
    `${fullName(from)} and ${fullName(to)} became close during their time around Ravenwood and have remained loyal friends.`,
    `${fullName(from)} quietly looks out for ${fullName(to)} because their friendship has survived several difficult years.`,
    `${fullName(from)} and ${fullName(to)} defend each other when gossip begins.`
  ]);
}

function mysteryRandomRelationshipDetail(from: MysteryNpc, to: MysteryNpc, kind: MysteryNpcRelationshipKind): string {
  if (kind === "Friendship") return mysteryFriendshipDetail(from, to);
  if (kind === "Debt") {
    return pick([
      `${fullName(from)} owes ${fullName(to)} money.`,
      `${fullName(from)} borrowed money from ${fullName(to)} and has not paid it back.`,
      `${fullName(to)} has been pressing ${fullName(from)} to repay a private debt.`
    ]);
  }
  if (kind === "Blackmail") {
    return pick([
      `${fullName(from)} knows an embarrassing secret about ${fullName(to)}.`,
      `${fullName(from)} has been quietly blackmailing ${fullName(to)}.`,
      `${fullName(to)} fears ${fullName(from)} will expose a private disgrace.`
    ]);
  }
  if (kind === "Rivalry") {
    return pick([
      `${fullName(from)} and ${fullName(to)} were seen arguing before the house was sealed.`,
      `${fullName(from)} and ${fullName(to)} absolutely despise each other.`,
      `${fullName(from)} and ${fullName(to)} have been competing bitterly for attention at Ravenwood.`
    ]);
  }
  return pick([
    `${fullName(from)} considers ${fullName(to)} useful, but not trustworthy.`,
    `${fullName(from)} has been warned not to trust ${fullName(to)}.`,
    `${fullName(from)} suspects ${fullName(to)} is hiding something important.`
  ]);
}

function mysteryOrdinaryFriendshipDetail(from: MysteryNpc, to: MysteryNpc): string {
  return pick([
    `${fullName(from)} and ${fullName(to)} have settled into an easy breakfast routine.`,
    `${fullName(from)} and ${fullName(to)} quietly trade books and favors.`,
    `${fullName(from)} and ${fullName(to)} seek each other out when the room grows tense.`,
    `${fullName(from)} and ${fullName(to)} share a dry sense of humor about Ravenwood's rules.`,
    `${fullName(from)} and ${fullName(to)} trust each other in a quiet, ordinary way.`
  ]);
}

function mysteryHappyFamilyDetail(from: MysteryNpc, to: MysteryNpc): string {
  return pick([
    `${fullName(from)} and ${fullName(to)} are fond of each other and show it without much fuss.`,
    `${fullName(from)} and ${fullName(to)} came to Ravenwood as family and are genuinely glad to be together.`,
    `${fullName(from)} looks after ${fullName(to)} with ordinary family warmth.`,
    `${fullName(from)} and ${fullName(to)} have the easy loyalty of a happy family.`
  ]);
}

function buildMysteryNpcRelationshipPool(npcs: MysteryNpc[], relationships: MysteryNpcRelationship[]) {
  const guests = npcs.filter((npc) => npc.role === "Guest");
  const staff = npcs.filter((npc) => npc.role === "Staff");
  const adults = npcs.filter((npc) => npc.age >= 18);
  const adultGuests = guests.filter((npc) => npc.age >= 18);
  const children = npcs.filter((npc) => npc.isChild);
  const usedPairs = new Set(relationships.map((relationship) => [relationship.fromId, relationship.toId].sort().join(":")));
  const pairKey = (a: MysteryNpc, b: MysteryNpc) => [a.id, b.id].sort().join(":");
  const addRandom = (from: MysteryNpc, to: MysteryNpc, kind: MysteryNpcRelationshipKind, detail: string, hidden = false, trustImpact = 0, motiveRisk = 0) => {
    if (from.id === to.id) return false;
    if (kind === "Family" && !mysteryAllowsStaffGuestBloodFamily(from, to)) return false;
    if (mysteryIsRomanticRelationship(kind) && !mysteryAllowsLargeAgeGapRomance(from, to)) return false;
    const key = pairKey(from, to);
    if (usedPairs.has(key) && roll(0.72)) return false;
    const added = addMysteryNpcRelationship(relationships, from, to, kind, detail, { hidden, trustImpact, motiveRisk, skipGuards: true });
    if (added) usedPairs.add(key);
    return added;
  };

  const familyLinks = relationships.filter((relationship) => relationship.kind === "Family" || relationship.kind === "Marriage");
  for (const relationship of familyLinks) {
    const from = npcs.find((npc) => npc.id === relationship.fromId);
    const to = npcs.find((npc) => npc.id === relationship.toId);
    if (!from || !to || roll(0.7)) continue;
    addRandom(from, to, "Protection", mysteryHappyFamilyDetail(from, to), false, rand(8, 14), 0);
  }

  const ordinaryFriendshipTarget = clamp(Math.floor(npcs.length / 5), 1, 3);
  for (let index = 0; index < ordinaryFriendshipTarget; index += 1) {
    const pool = roll(0.68) && adultGuests.length >= 2 ? adultGuests : adults;
    if (pool.length < 2) break;
    const from = pick(pool);
    const toCandidates = pool.filter((npc) => npc.id !== from.id);
    const to = pick(toCandidates);
    addRandom(from, to, "Friendship", mysteryOrdinaryFriendshipDetail(from, to), false, rand(6, 12), 0);
  }

  for (const staffMember of staff) {
    const guest = guests.length > 0 ? pick(guests) : undefined;
    if (guest && roll(0.26)) {
      const detail = mysteryServantKnowledgeDetail(staffMember, guest, npcs);
      ensureSharedRavenwoodHistory(staffMember, guest);
      addRandom(staffMember, guest, pick<MysteryNpcRelationshipKind>(["Work", "Suspicion", "Protection"]), detail, roll(0.45), rand(-8, 6), rand(1, 7));
    }
  }

  const targetExtraLinks = rand(6, 12);
  for (let index = 0; index < targetExtraLinks; index += 1) {
    const pool = roll(0.75) && adults.length >= 2 ? adults : npcs;
    if (pool.length < 2) break;
    const from = pick(pool);
    const toCandidates = pool.filter((npc) => npc.id !== from.id);
    const to = pick(toCandidates);
    if (from.age < 18 || to.age < 18) {
      const argumentPartnerCandidates = npcs.filter((npc) => npc.id !== from.id && npc.id !== to.id);
      const argumentPartner = argumentPartnerCandidates.length > 0 ? pick(argumentPartnerCandidates) : undefined;
      const argumentPartnerName = argumentPartner ? fullName(argumentPartner) : "someone";
      addRandom(from, to, pick<MysteryNpcRelationshipKind>(["Friendship", "Protection", "Suspicion"]), pick([
        `${fullName(from)} trusts ${fullName(to)} more than most people in the house.`,
        `${fullName(from)} has been warned not to be alone with ${fullName(to)}.`,
        from.isChild
          ? `${fullName(from)} overheard ${fullName(to)} arguing with ${argumentPartnerName} and has not understood the meaning yet.`
          : `${fullName(from)} overheard ${fullName(to)} arguing with ${argumentPartnerName}.`
      ]), roll(0.42), rand(-4, 8), rand(0, 4));
    } else if (roll(0.1)) {
      const romanticTo = mysteryPickWeightedRomanticCandidate(
        from,
        toCandidates.filter((candidate) => candidate.age >= 18 && mysteryAllowsLargeAgeGapRomance(from, candidate))
      );
      if (!romanticTo) continue;
      ensureSharedRavenwoodHistory(from, romanticTo);
      const romanceDetail = mysteryRomanceHistoryDetail(from, romanticTo);
      const romanceKind: MysteryNpcRelationshipKind = mysteryHasOfficialPartnerFor(relationships, from) ||
        mysteryHasOfficialPartnerFor(relationships, romanticTo) ||
        mysteryHasOfficialPartnerStatus(from) ||
        mysteryHasOfficialPartnerStatus(romanticTo)
        ? "Affair"
        : pick<MysteryNpcRelationshipKind>(["Romance", "Affair"]);
      addRandom(from, romanticTo, romanceKind, romanceDetail, true, rand(-10, 12), rand(5, 14));
    } else {
      const kind = pick<MysteryNpcRelationshipKind>(["Friendship", "Rivalry", "Debt", "Blackmail", "Suspicion"]);
      const detail = mysteryRandomRelationshipDetail(from, to, kind);
      if (detail.includes("absolutely despise")) ensureSharedRavenwoodHistory(from, to);
      addRandom(from, to, kind, detail, roll(0.5), kind === "Friendship" ? rand(6, 14) : rand(-14, 10), kind === "Friendship" ? rand(0, 4) : rand(2, 12));
    }
  }

  for (const child of children) {
    const guardian = adultGuests.find((guest) => child.familyRelationNote?.includes(fullName(guest)));
    if (guardian) {
      const alreadyRecorded = relationships.some((relationship) =>
        relationship.kind === "Family" &&
        ((relationship.fromId === guardian.id && relationship.toId === child.id) || (relationship.fromId === child.id && relationship.toId === guardian.id))
      );
      if (alreadyRecorded) continue;
      addMysteryNpcRelationship(relationships, guardian, child, "Family", `${fullName(child)} is staying under ${fullName(guardian)}'s care.`, { trustImpact: 12, motiveRisk: 1 });
    }
  }
}

function buildMysterySanityLedger(mystery: Pick<MysteryGame, "id" | "title" | "player" | "day" | "daytime" | "rooms" | "npcs" | "npcRelationships" | "murders" | "findables" | "currentRoomId" | "playerRoomId" | "inventory">): string[] {
  const roomName = (roomId: string) => mystery.rooms.find((room) => room.id === roomId)?.name ?? roomId;
  const lines = [
    `Ledger created for ${mystery.title} (${mystery.id}).`,
    `Player: ${fullName(mystery.player)}; ${mystery.player.sex}; assigned room ${roomName(mystery.playerRoomId)}; current room ${roomName(mystery.currentRoomId)}.`,
    `Clock: Day ${mystery.day}, ${mystery.daytime}. Inventory: ${mystery.inventory.join(", ")}.`,
    `Rooms: ${mystery.rooms.length} total; ${mystery.rooms.filter((room) => room.accessible).length} accessible at start.`,
    `NPCs: ${mystery.npcs.length} total; ${mystery.npcs.filter((npc) => npc.role === "Guest").length} guests; ${mystery.npcs.filter((npc) => npc.role === "Staff").length} staff.`,
    `NPC sex balance: ${mystery.npcs.filter((npc) => npc.sex === "Female").length} female; ${mystery.npcs.filter((npc) => npc.sex === "Male").length} male.`,
    "NPC roster:"
  ];
  lines.push(...mystery.npcs.map((npc) => `- ${fullName(npc)}: ${npc.sex}, age ${npc.age}, ${npc.role}, ${npc.alive ? "alive" : "dead"}, room/station ${roomName(npc.role === "Guest" ? npc.roomId : npc.stationRoomId)}. Stay: ${npc.currentStay ?? "not recorded"} ${npc.plannedStay ?? ""} Previous: ${npc.previousStay ?? "not recorded"}`));
  lines.push("NPC-to-NPC relationships:");
  lines.push(...(mystery.npcRelationships.length > 0
    ? mystery.npcRelationships.map((relationship) => {
      const from = mystery.npcs.find((npc) => npc.id === relationship.fromId);
      const to = mystery.npcs.find((npc) => npc.id === relationship.toId);
      const availability = relationship.availableDay && relationship.availableDaytime ? `; available=${mysteryAvailabilityLabel(relationship.availableDay, relationship.availableDaytime)}` : "";
      return `- ${relationship.kind}: ${from ? fullName(from) : "Unknown"} <-> ${to ? fullName(to) : "Unknown"}; hidden=${relationship.hidden}; motiveRisk=${relationship.motiveRisk}${availability}; ${relationship.detail}`;
    })
    : ["- None recorded."]));
  lines.push("Murder blueprint:");
  lines.push(...mystery.murders.map((murder, index) => {
    const victim = mystery.npcs.find((npc) => npc.id === murder.victimId);
    const killer = mystery.npcs.find((npc) => npc.id === murder.killerId);
    return `- Murder ${index + 1}: victim ${victim ? fullName(victim) : "Unknown"}, killer ${killer ? fullName(killer) : "Unknown"}, Day ${murder.day} ${murder.daytime}, ${roomName(murder.roomId)}, ${murder.method}. Motive: ${cleanSentenceEnd(murder.motive)}. Proof: ${(murder.proofs?.length ? murder.proofs : [murder.proof]).join(" | ")}.`;
  }));
  lines.push("Generated findables:");
  lines.push(...(mystery.findables.length > 0
    ? mystery.findables.map((findable) => {
      const room = findable.roomId ? roomName(findable.roomId) : "not room-bound";
      const holder = findable.holderNpcId ? mystery.npcs.find((npc) => npc.id === findable.holderNpcId) : undefined;
      return `- ${findable.kind}: ${findable.name}; ${findable.description}; room=${room}; holder=${holder ? fullName(holder) : "none"}; available=${mysteryAvailabilityLabel(findable.availableDay, findable.availableDaytime)}.`;
    })
    : ["- No generated findables."]));
  return lines;
}

function buildMysteryRooms(): MysteryRoom[] {
  const guestBedSetups = [
    { bedSetup: "single bed", capacity: 1 },
    { bedSetup: "double bed", capacity: 2 },
    { bedSetup: "two single beds", capacity: 2 }
  ];
  const publicRooms: MysteryRoom[] = [
    { id: "grand-hall", name: "Great Hall", floor: 1, kind: "public", accessible: true, occupantIds: [] },
    { id: "drawing-room", name: "Drawing Room", floor: 1, kind: "public", accessible: true, occupantIds: [] },
    { id: "dining-room", name: "Dining Room", floor: 1, kind: "public", accessible: true, occupantIds: [] },
    { id: "library", name: "Library", floor: 1, kind: "public", accessible: true, occupantIds: [] },
    { id: "conservatory", name: "Conservatory", floor: 1, kind: "public", accessible: true, occupantIds: [] },
    { id: "billiards-room", name: "Billiards Room", floor: 1, kind: "public", accessible: true, occupantIds: [] },
    { id: "smoking-room", name: "Smoking Room", floor: 1, kind: "public", accessible: true, occupantIds: [] },
    { id: "west-gallery", name: "West Gallery", floor: 2, kind: "public", accessible: true, occupantIds: [] },
    { id: "garden-terrace", name: "Garden Terrace", floor: 1, kind: "public", accessible: true, occupantIds: [] },
    { id: "kitchen", name: "Kitchen", floor: 1, kind: "service", accessible: false, occupantIds: [] },
    { id: "staff-corridor", name: "Staff Corridor", floor: 1, kind: "staff", accessible: false, occupantIds: [] },
    { id: "servants-hall", name: "Servants Hall", floor: 1, kind: "staff", accessible: false, occupantIds: [] },
    { id: "pantry", name: "Pantry", floor: 1, kind: "service", accessible: false, occupantIds: [] },
    { id: "laundry", name: "Laundry", floor: 1, kind: "service", accessible: false, occupantIds: [] },
    { id: "back-stairs", name: "Back Stairs", floor: 2, kind: "staff", accessible: false, occupantIds: [] }
  ];
  const guestRooms: MysteryRoom[] = Array.from({ length: 13 }, (_, index) => ({
    ...guestBedSetups[index % guestBedSetups.length],
    id: `guest-room-${index + 1}`,
    name: `Guest Room ${index + 1}`,
    floor: index < 6 ? 2 : 3,
    kind: "guest",
    accessible: false,
    occupantIds: []
  }));
  return [...publicRooms, ...guestRooms];
}

function mysteryCanonicalRoomOrder(room: Pick<MysteryRoom, "floor" | "id" | "name">): number {
  const guestRoomMatch = room.id.match(/^guest-room-(\d+)$/);
  if (guestRoomMatch) return room.floor * 1000 + Number(guestRoomMatch[1]);
  const roomOrder: Record<string, number> = {
    "grand-hall": 1,
    "drawing-room": 2,
    "dining-room": 3,
    library: 4,
    conservatory: 5,
    "billiards-room": 6,
    "smoking-room": 7,
    "garden-terrace": 8,
    kitchen: 9,
    "staff-corridor": 10,
    "servants-hall": 11,
    pantry: 12,
    laundry: 13,
    "west-gallery": 1,
    "back-stairs": 2
  };
  return room.floor * 1000 + (roomOrder[room.id] ?? 900 + stableHash(room.id));
}

function mysteryRoomsInCanonicalOrder(rooms: MysteryRoom[]): MysteryRoom[] {
  return [...rooms].sort((a, b) => mysteryCanonicalRoomOrder(a) - mysteryCanonicalRoomOrder(b) || a.name.localeCompare(b.name));
}

function assignMysteryGuestRooms(rooms: MysteryRoom[], npcs: MysteryNpc[], relationships: MysteryNpcRelationship[], playerRoomId: string) {
  const guestRooms = rooms.filter((room) => room.kind === "guest");
  const playerRoom = rooms.find((room) => room.id === playerRoomId);
  for (const room of guestRooms) {
    room.occupantIds = room.id === playerRoomId ? ["player"] : [];
  }
  if (playerRoom) {
    playerRoom.accessible = true;
    playerRoom.capacity = 1;
    playerRoom.bedSetup = "single bed";
  }

  const availableRooms = guestRooms.filter((room) => room.id !== playerRoomId);
  let nextRoomIndex = 0;
  const unassigned = new Set(npcs.filter((npc) => npc.role === "Guest").map((npc) => npc.id));
  const guestById = new Map(npcs.filter((npc) => npc.role === "Guest").map((npc) => [npc.id, npc]));
  const roomForGroup = () => availableRooms[nextRoomIndex++] ?? availableRooms[availableRooms.length - 1];
  const placeGroup = (group: MysteryNpc[], bedSetup: string) => {
    const room = roomForGroup();
    if (!room || group.length === 0) return;
    room.occupantIds = [];
    room.capacity = Math.max(group.length, bedSetup === "double bed" ? 2 : 1);
    room.bedSetup = bedSetup;
    for (const npc of group) {
      npc.roomId = room.id;
      if (!room.occupantIds.includes(npc.id)) room.occupantIds.push(npc.id);
      unassigned.delete(npc.id);
    }
  };

  const marriageGroups: MysteryNpc[][] = [];
  for (const relationship of relationships.filter((candidate) => candidate.kind === "Marriage")) {
    const left = guestById.get(relationship.fromId);
    const right = guestById.get(relationship.toId);
    if (left && right && left.age >= 18 && right.age >= 18 && unassigned.has(left.id) && unassigned.has(right.id)) {
      marriageGroups.push([left, right]);
    }
  }

  const childrenByGuardian = new Map<string, MysteryNpc[]>();
  for (const child of npcs.filter((npc) => npc.role === "Guest" && npc.age < 18)) {
    const familyLinks = relationships.filter((relationship) =>
      relationship.kind === "Family" && (relationship.fromId === child.id || relationship.toId === child.id)
    );
    const guardian = familyLinks
      .map((relationship) => guestById.get(relationship.fromId === child.id ? relationship.toId : relationship.fromId))
      .find((candidate): candidate is MysteryNpc => Boolean(candidate && candidate.age >= 18))
      ?? npcs.find((candidate) => candidate.role === "Guest" && candidate.age >= 18 && candidate.familyName === child.familyName);
    if (!guardian) continue;
    childrenByGuardian.set(guardian.id, [...(childrenByGuardian.get(guardian.id) ?? []), child]);
  }

  for (const group of marriageGroups) {
    const children = group.flatMap((adult) => childrenByGuardian.get(adult.id) ?? []).filter((child) => unassigned.has(child.id));
    placeGroup([...group, ...children], children.length > 0 ? "double bed and child bed" : "double bed");
  }

  for (const [guardianId, children] of childrenByGuardian) {
    const guardian = guestById.get(guardianId);
    const remainingChildren = children.filter((child) => unassigned.has(child.id));
    if (guardian && unassigned.has(guardian.id) && remainingChildren.length > 0) {
      placeGroup([guardian, ...remainingChildren], remainingChildren.length > 1 ? "single bed and child beds" : "single bed and child bed");
    }
  }

  for (const npc of npcs.filter((candidate) => candidate.role === "Guest" && unassigned.has(candidate.id))) {
    placeGroup([npc], "single bed");
  }
}

function makeMysteryNpc(
  input: Partial<MysteryNpc> & { role: "Guest" | "Staff"; age: number; roomId: string; stationRoomId: string },
  usedNames: Set<string>,
  usedFirstNames: Set<string>,
  blockedFamilyNames = new Set<string>()
): MysteryNpc {
  const sex = input.sex ?? pick<Sex>(["Female", "Male"]);
  const familyName = input.familyName ? cleanRavenwoodNameText(input.familyName) : ravenwoodFamilyName(undefined, blockedFamilyNames);
  if (!input.familyName) blockedFamilyNames.add(familyName.toLowerCase());
  const normalizedAge = clamp(input.age, input.role === "Staff" ? RAVENWOOD_MIN_STAFF_AGE : RAVENWOOD_MIN_NPC_AGE, RAVENWOOD_MAX_NPC_AGE);
  const isChild = normalizedAge < 14;
  const profile = mysteryProfileFor(normalizedAge, input.role, sex);
  const reasonOfStay = input.reasonOfStay ?? (input.role === "Staff" ? "WORK" : mysteryReasonOfStayForGuest({ age: normalizedAge, occupation: profile.occupation, role: input.role }));
  const stayHistory = mysteryStayHistoryFor(input.role, normalizedAge, reasonOfStay);
  const substancePreference = isChild ? "none" : input.substancePreference ?? mysterySubstancePreferenceFor(normalizedAge, input.role);
  return {
    id: input.id ?? uid(),
    firstName: input.firstName ? cleanRavenwoodNameText(input.firstName) : uniqueRavenwoodFirstName(sex, familyName, usedNames, usedFirstNames),
    familyName,
    sex,
    age: normalizedAge,
    role: input.role,
    familyStatus: input.familyStatus ?? mysteryFamilyStatusFor(normalizedAge, input.role),
    education: input.education ?? profile.education,
    occupation: input.occupation ?? profile.occupation,
    reasonOfStay,
    currentStay: input.currentStay ?? stayHistory.currentStay,
    plannedStay: input.plannedStay ?? stayHistory.plannedStay,
    previousStay: input.previousStay ?? stayHistory.previousStay,
    secret: input.secret ?? mysterySecretFor(normalizedAge),
    roomId: input.roomId,
    stationRoomId: input.stationRoomId,
    trust: input.trust ?? rand(4, 18),
    temporaryTrust: input.temporaryTrust ?? 0,
    romance: input.romance ?? 0,
    romanceRevealed: input.romanceRevealed ?? false,
    substancePreference,
    substanceState: input.substanceState ?? "sober",
    substanceTurns: input.substanceTurns ?? 0,
    familyRelationNote: input.familyRelationNote,
    ravenwoodPortraitKey: input.ravenwoodPortraitKey,
    portraitLineage: input.portraitLineage,
    visualRace: input.visualRace,
    alive: input.alive ?? true,
    isChild
  };
}

function mysteryAdultGuestFamilyPlans(adultGuestCount: number): MysteryAdultFamilyPlan[] {
  const plans: MysteryAdultFamilyPlan[] = Array.from({ length: adultGuestCount }, () => null);
  if (adultGuestCount < 2) return plans;

  const clustered = new Set<number>();
  const clusterCount = adultGuestCount >= 10 && roll(0.45) ? 2 : 1;
  let plannedCousins = 0;

  for (let clusterIndex = 0; clusterIndex < clusterCount; clusterIndex += 1) {
    const anchorCandidates = Array.from({ length: adultGuestCount - 1 }, (_, index) => index)
      .filter((index) => !clustered.has(index));
    if (anchorCandidates.length === 0) break;
    const anchorIndex = pick(anchorCandidates);
    const possibleMembers = Array.from({ length: adultGuestCount - anchorIndex - 1 }, (_, offset) => anchorIndex + offset + 1)
      .filter((index) => !clustered.has(index) && !plans[index]);
    if (possibleMembers.length === 0) continue;

    const clusterSize = Math.min(possibleMembers.length + 1, rand(2, adultGuestCount >= 9 ? 4 : 3));
    const members = shuffled(possibleMembers).slice(0, clusterSize - 1).sort((a, b) => a - b);
    const clusterMembers = [anchorIndex];
    clustered.add(anchorIndex);

    for (const memberIndex of members) {
      const relatedIndex = pick(clusterMembers);
      const firstFamilyLink = clusterMembers.length === 1;
      const possibleLinks: MysteryAdultFamilyLink[] = firstFamilyLink
        ? ["Spouse", "Sibling", "Adult child", "Parent"]
        : ["Sibling", "Adult child", "Parent", plannedCousins < 2 ? "Cousin" : "Sibling"];
      const link = pick(possibleLinks);
      if (link === "Cousin") plannedCousins += 1;
      plans[memberIndex] = { relatedIndex, link };
      clusterMembers.push(memberIndex);
      clustered.add(memberIndex);
    }
  }

  return plans;
}

function createMysteryGameFromDraft(
  draft: CharacterDraft,
  detectiveProfile?: MysteryDetectiveProfile,
  detectiveAge = 30
): MysteryGame {
  const playerInput = detectiveProfile ?? draft;
  const playerAge = detectiveProfile ? detectiveAge : 30;
  const usedNames = new Set<string>();
  const usedFirstNames = new Set<string>();
  const usedPortraitKeys = new Set<string>();
  const usedPortraitSignatures = new Set<string>();
  const playerFamilyName = detectiveProfile
    ? cleanRavenwoodNameText(detectiveProfile.familyName.trim())
    : ravenwoodFamilyName(playerInput.familyName.trim());

  const playerFirstName = detectiveProfile
    ? cleanRavenwoodNameText(detectiveProfile.firstName.trim())
    : uniqueRavenwoodFirstName(
        playerInput.sex,
        playerFamilyName,
        usedNames,
        usedFirstNames,
        cleanRavenwoodNameText(playerInput.firstName.trim())
      );

  usedFirstNames.add(playerFirstName.toLowerCase());
  usedNames.add(`${playerFirstName} ${playerFamilyName}`.toLowerCase());

  const blockedFamilyNames = new Set<string>([
    playerFamilyName.toLowerCase()
  ]);
  const playerPortrait = detectiveProfile
    ? ravenwoodPlayerPortraitFor(detectiveProfile, playerAge)
    : chooseRavenwoodPlayerPortrait({ sex: playerInput.sex, age: playerAge, usedPortraitKeys, usedPortraitSignatures });
  markRavenwoodPortraitUsed(playerPortrait, usedPortraitKeys, usedPortraitSignatures);
  const rooms = buildMysteryRooms();
  const guestRooms = rooms.filter((room) => room.id.startsWith("guest-room"));
  const playerRoom = pick(guestRooms);
  playerRoom.accessible = true;
  playerRoom.capacity = 1;
  playerRoom.bedSetup = "single bed";
  playerRoom.occupantIds.push("player");
  const residentCount = rand(16, 20);
  const guestCount = rand(8, Math.min(12, residentCount - 8));
  const staffCount = residentCount - guestCount;
  const childCount = rand(0, 2);
  const npcs: MysteryNpc[] = [];
  const npcRelationships: MysteryNpcRelationship[] = [];
  const familyGraph = emptyMysteryFamilyGraph();
  const residentSexPlan = mysteryBalancedSexPlan(residentCount, playerInput.sex);
  let residentSexIndex = 0;
  const nextResidentSex = () => residentSexPlan[residentSexIndex++] ?? pick<Sex>(["Female", "Male"]);
  const distinctGuestFamilyName = (blockedExtra: string[] = []) => {
    const localBlocked = new Set(blockedFamilyNames);
    for (const name of blockedExtra) localBlocked.add(cleanRavenwoodNameText(name).toLowerCase());
    const familyName = ravenwoodFamilyName(undefined, localBlocked);
    blockedFamilyNames.add(familyName.toLowerCase());
    return familyName;
  };
  const hasGeneratedSibling = (npc: MysteryNpc) => npcRelationships.some((relationship) =>
    relationship.kind === "Family" &&
    relationship.detail.toLowerCase().includes("siblings") &&
    (relationship.fromId === npc.id || relationship.toId === npc.id)
  );
  const familyNameForRelatedAdult = (relatedAdult: MysteryNpc | null, familyLink: MysteryAdultFamilyLink | null) => {
    if (!relatedAdult || !familyLink) return undefined;
    if (familyLink === "Spouse") {
      return hasGeneratedSibling(relatedAdult) || roll(0.45)
        ? distinctGuestFamilyName([relatedAdult.familyName])
        : relatedAdult.familyName;
    }
    if (familyLink === "Sibling") {
      const spouse = mysterySpouseFor(npcRelationships, relatedAdult, adultGuests);
      return spouse && spouse.familyName === relatedAdult.familyName
        ? distinctGuestFamilyName([relatedAdult.familyName])
        : relatedAdult.familyName;
    }
    return relatedAdult.familyName;
  };
  const roomsWithGuestSpace = () => guestRooms.filter((room) => room.id !== playerRoom.id && room.occupantIds.length < (room.capacity ?? 1));
  const moveNpcToRoom = (npc: MysteryNpc, room: MysteryRoom) => {
    const oldRoom = rooms.find((candidate) => candidate.id === npc.roomId);
    if (oldRoom) oldRoom.occupantIds = oldRoom.occupantIds.filter((id) => id !== npc.id);
    npc.roomId = room.id;
    if (!room.occupantIds.includes(npc.id)) room.occupantIds.push(npc.id);
  };
  const ensureChildCanStayWithAdult = (room: MysteryRoom) => {
    room.capacity = Math.max(room.capacity ?? 1, room.occupantIds.length + 1);
    if (!room.bedSetup?.toLowerCase().includes("child")) {
      room.bedSetup = room.bedSetup === "two single beds"
        ? "two single beds and child bed"
        : room.bedSetup === "single bed"
          ? "single bed and child bed"
          : "double bed and child bed";
    }
  };
  const adultGuests: MysteryNpc[] = [];
  const adultFamilyPlans = mysteryAdultGuestFamilyPlans(guestCount - childCount);
  let generatedCousinLinks = 0;
  for (let index = 0; index < guestCount - childCount; index += 1) {
    const roomsWithSpace = roomsWithGuestSpace();
    const sharedRooms = roomsWithSpace.filter((room) => room.occupantIds.length > 0);
    const emptyRooms = roomsWithSpace.filter((room) => room.occupantIds.length === 0);
    const room = sharedRooms.length > 0 && roll(0.25)
      ? pick(sharedRooms)
      : pick(emptyRooms.length > 0 ? emptyRooms : roomsWithSpace);
    const plannedFamily = adultFamilyPlans[index];
    const relatedAdult = plannedFamily ? adultGuests[plannedFamily.relatedIndex] ?? null : null;
    const possibleFamilyLinks: MysteryAdultFamilyLink[] = relatedAdult
      ? ([
        "Sibling",
        generatedCousinLinks < 3 ? "Cousin" : "",
        relatedAdult.age >= 36 ? "Adult child" : "",
        relatedAdult.age <= 58 ? "Parent" : "",
        !mysteryHasSpouseRelationship(npcRelationships, relatedAdult) ? "Spouse" : ""
      ].filter((link): link is MysteryAdultFamilyLink => Boolean(link))
      )
      : [];
    const familyLink = relatedAdult && possibleFamilyLinks.length > 0
      ? plannedFamily && possibleFamilyLinks.includes(plannedFamily.link)
        ? plannedFamily.link
        : pick(possibleFamilyLinks)
      : null;
    const relatedAge = relatedAdult?.age ?? rand(18, RAVENWOOD_MAX_NPC_AGE);
    const plannedSex = nextResidentSex();
    const sex = familyLink === "Spouse" && relatedAdult
      ? mysteryWeightedRomanticSex(relatedAdult)
      : plannedSex;
    const age = familyLink === "Spouse"
      ? (() => {
        const proposedAge = clamp(relatedAge + rand(-9, 9), 18, RAVENWOOD_MAX_NPC_AGE);
        if (relatedAge >= 50 && proposedAge < 50 && !roll(0.08)) return rand(50, Math.max(50, Math.min(RAVENWOOD_MAX_NPC_AGE, relatedAge + 9)));
        if (relatedAge < 50 && proposedAge >= 50 && !roll(0.08)) return rand(18, 49);
        return proposedAge;
      })()
      : familyLink === "Sibling" || familyLink === "Cousin"
        ? clamp(relatedAge + rand(-14, 14), 18, RAVENWOOD_MAX_NPC_AGE)
        : familyLink === "Adult child"
          ? rand(18, Math.max(18, relatedAge - 18))
          : familyLink === "Parent"
            ? clamp(relatedAge + rand(18, 38), 36, RAVENWOOD_MAX_NPC_AGE)
            : rand(18, RAVENWOOD_MAX_NPC_AGE);
    const familyStatus = familyLink === "Spouse" ? "Married" : undefined;
    const bloodRelative = Boolean(relatedAdult && familyLink !== "Spouse");
    const generatedFamilyName = familyNameForRelatedAdult(relatedAdult, familyLink);
    const portrait = chooseRavenwoodGuestPortrait({
      sex,
      age,
      usedPortraitKeys,
      usedPortraitSignatures,
      visualRace: bloodRelative ? relatedAdult?.visualRace : undefined,
      lineage: bloodRelative && relatedAdult?.sex === sex ? relatedAdult.portraitLineage : undefined
    });
    const npc = makeMysteryNpc({
      role: "Guest",
      sex,
      age,
      familyName: generatedFamilyName,
      familyStatus,
      reasonOfStay: relatedAdult ? relatedAdult.reasonOfStay : undefined,
      currentStay: relatedAdult ? relatedAdult.currentStay : undefined,
      plannedStay: relatedAdult ? relatedAdult.plannedStay : undefined,
      previousStay: relatedAdult ? relatedAdult.previousStay : undefined,
      ravenwoodPortraitKey: portrait?.key,
      portraitLineage: portrait?.lineage,
      visualRace: portrait?.visualRace,
      roomId: room.id,
      stationRoomId: pick(["drawing-room", "library", "dining-room", "conservatory", "billiards-room", "smoking-room", "west-gallery"])
    }, usedNames, usedFirstNames, blockedFamilyNames);
    if (relatedAdult && familyLink === "Spouse") {
      const added = addMysteryNpcRelationship(npcRelationships, relatedAdult, npc, "Marriage", `${fullName(relatedAdult)} and ${fullName(npc)} arrived as spouses.`, { trustImpact: 10, motiveRisk: 3, skipGuards: true });
      if (added) {
        addMysteryStoredFamilyPair(familyGraph, relatedAdult, npc, "spouse", "spouse");
        relatedAdult.familyStatus = "Married";
        addMysteryFamilyNote(relatedAdult, `Spouse of ${fullName(npc)}`);
        addMysteryFamilyNote(npc, `Spouse of ${fullName(relatedAdult)}`);
      }
    } else if (relatedAdult && familyLink === "Sibling") {
      const added = addMysteryNpcRelationship(npcRelationships, relatedAdult, npc, "Family", `${fullName(relatedAdult)} and ${fullName(npc)} are siblings.`, { trustImpact: 8, motiveRisk: 2 });
      if (added) {
        addMysteryStoredFamilyPair(familyGraph, relatedAdult, npc, mysterySiblingRole(relatedAdult) as MysteryFamilyRelationLabel, mysterySiblingRole(npc) as MysteryFamilyRelationLabel);
        addMysteryFamilyNote(relatedAdult, `${mysteryTitleCaseRelation(mysterySiblingRole(relatedAdult))} of ${fullName(npc)}`);
        addMysteryFamilyNote(npc, `${mysteryTitleCaseRelation(mysterySiblingRole(npc))} of ${fullName(relatedAdult)}`);
      }
    } else if (relatedAdult && familyLink === "Cousin") {
      const added = addMysteryNpcRelationship(npcRelationships, relatedAdult, npc, "Family", `${fullName(relatedAdult)} and ${fullName(npc)} are cousins.`, { trustImpact: 5, motiveRisk: 2 });
      if (added) {
        addMysteryStoredFamilyPair(familyGraph, relatedAdult, npc, "cousin", "cousin");
        generatedCousinLinks += 1;
        addMysteryFamilyNote(relatedAdult, `Cousin of ${fullName(npc)}`);
        addMysteryFamilyNote(npc, `Cousin of ${fullName(relatedAdult)}`);
      }
    } else if (relatedAdult && familyLink === "Adult child") {
      const added = addMysteryNpcRelationship(npcRelationships, relatedAdult, npc, "Family", `${fullName(relatedAdult)} is parent to ${fullName(npc)}.`, { trustImpact: 9, motiveRisk: 3 });
      if (added) {
        addMysteryStoredFamilyPair(familyGraph, relatedAdult, npc, mysteryParentRole(relatedAdult) as MysteryFamilyRelationLabel, mysteryChildRole(npc) as MysteryFamilyRelationLabel);
        addMysteryFamilyNote(relatedAdult, `${mysteryTitleCaseRelation(mysteryParentRole(relatedAdult))} of ${mysteryChildRole(npc)} ${fullName(npc)}`);
        addMysteryFamilyNote(npc, `${mysteryTitleCaseRelation(mysteryChildRole(npc))} of ${mysteryParentRole(relatedAdult)} ${fullName(relatedAdult)}`);
      }
    } else if (relatedAdult && familyLink === "Parent") {
      const added = addMysteryNpcRelationship(npcRelationships, relatedAdult, npc, "Family", `${fullName(npc)} is parent to ${fullName(relatedAdult)}.`, { trustImpact: 9, motiveRisk: 3 });
      if (added) {
        addMysteryStoredFamilyPair(familyGraph, npc, relatedAdult, mysteryParentRole(npc) as MysteryFamilyRelationLabel, mysteryChildRole(relatedAdult) as MysteryFamilyRelationLabel);
        addMysteryFamilyNote(relatedAdult, `${mysteryTitleCaseRelation(mysteryChildRole(relatedAdult))} of ${mysteryParentRole(npc)} ${fullName(npc)}`);
        addMysteryFamilyNote(npc, `${mysteryTitleCaseRelation(mysteryParentRole(npc))} of ${mysteryChildRole(relatedAdult)} ${fullName(relatedAdult)}`);
      }
    }
    npcs.push(npc);
    adultGuests.push(npc);
    room.occupantIds.push(npc.id);
  }
  for (let index = 0; index < childCount; index += 1) {
    const childAge = rand(RAVENWOOD_MIN_NPC_AGE, 13);
    const plausibleGuardians = adultGuests.filter((guest) => guest.age >= childAge + 5);
    const plausibleMarriedParents = plausibleGuardians.filter((guest) => {
      const spouse = mysterySpouseFor(npcRelationships, guest, adultGuests);
      return Boolean(spouse && guest.age >= childAge + 22 && spouse.age >= childAge + 18);
    });
    const guardianPool = plausibleMarriedParents.length > 0 && roll(0.58)
      ? plausibleMarriedParents
      : plausibleGuardians.length > 0
        ? plausibleGuardians
        : adultGuests;
    const guardian = pick(guardianPool);
    const childRoom = guestRooms.find((room) => room.id === guardian.roomId) ?? pick(guestRooms.filter((room) => room.id !== playerRoom.id));
    if (!childRoom.occupantIds.includes(guardian.id)) moveNpcToRoom(guardian, childRoom);
    ensureChildCanStayWithAdult(childRoom);
    const childSex = nextResidentSex();
    const guardianRelation = mysteryChildGuardianRelation(childSex, childAge, guardian);
    const child = makeMysteryNpc({
      role: "Guest",
      sex: childSex,
      age: childAge,
      familyName: guardian.familyName,
      familyStatus: "Child",
      education: mysteryEducationFor(childAge, "Guest"),
      occupation: "None",
      reasonOfStay: guardian.reasonOfStay,
      currentStay: guardian.currentStay,
      plannedStay: guardian.plannedStay,
      previousStay: guardian.previousStay,
      roomId: childRoom.id,
      stationRoomId: guardian.stationRoomId
    }, usedNames, usedFirstNames, blockedFamilyNames);
    const childPortrait = chooseRavenwoodGuestPortrait({
      sex: child.sex,
      age: child.age,
      usedPortraitKeys,
      usedPortraitSignatures,
      visualRace: guardian.visualRace,
      lineage: guardian.sex === child.sex ? guardian.portraitLineage : undefined
    });
    child.ravenwoodPortraitKey = childPortrait?.key;
    child.portraitLineage = childPortrait?.lineage;
    child.visualRace = childPortrait?.visualRace ?? guardian.visualRace;
    const spouse = mysterySpouseFor(npcRelationships, guardian, adultGuests);
    const shouldMakeSharedChild = Boolean(
      spouse &&
      (guardianRelation.reasonRole === "mother" || guardianRelation.reasonRole === "father") &&
      spouse!.age >= child.age + 14
    );
    const effectiveGuardianRelation = shouldMakeSharedChild
      ? {
        childRelation: `${mysteryChildRole(child)} of`,
        guardianRelation: `${mysteryParentRole(guardian)} of`,
        reasonRole: mysteryParentRole(guardian)
      }
      : guardianRelation;
    const childRelationshipAdded = addMysteryNpcRelationship(npcRelationships, guardian, child, "Family", `${fullName(child)} is staying with ${effectiveGuardianRelation.reasonRole} ${fullName(guardian)}.`, { trustImpact: 12, motiveRisk: 2 });
    if (childRelationshipAdded) {
      if (effectiveGuardianRelation.reasonRole === "mother" || effectiveGuardianRelation.reasonRole === "father") {
        addMysteryStoredFamilyPair(familyGraph, guardian, child, mysteryParentRole(guardian) as MysteryFamilyRelationLabel, mysteryChildRole(child) as MysteryFamilyRelationLabel);
      } else if (effectiveGuardianRelation.reasonRole === "older sister" || effectiveGuardianRelation.reasonRole === "older brother") {
        addMysteryStoredFamilyPair(familyGraph, guardian, child, mysterySiblingRole(guardian) as MysteryFamilyRelationLabel, mysterySiblingRole(child) as MysteryFamilyRelationLabel);
      } else {
        addMysteryStoredFamilyPair(familyGraph, guardian, child, mysterySexedRole(guardian, "aunt", "uncle") as MysteryFamilyRelationLabel, mysterySexedRole(child, "niece", "nephew") as MysteryFamilyRelationLabel);
      }
      addMysteryFamilyNote(guardian, `${titleCase(effectiveGuardianRelation.guardianRelation)} ${fullName(child)}`);
      addMysteryFamilyNote(child, `${titleCase(effectiveGuardianRelation.childRelation)} ${fullName(guardian)}`);
      if (shouldMakeSharedChild && spouse) {
        const spouseRole = mysteryParentRole(spouse);
        const coParentAdded = addMysteryNpcRelationship(npcRelationships, spouse, child, "Family", `${fullName(child)} is staying with ${spouseRole} ${fullName(spouse)}.`, { trustImpact: 12, motiveRisk: 2, skipGuards: true });
        if (coParentAdded) {
          addMysteryStoredFamilyPair(familyGraph, spouse, child, mysteryParentRole(spouse) as MysteryFamilyRelationLabel, mysteryChildRole(child) as MysteryFamilyRelationLabel);
          addMysteryFamilyNote(spouse, `${titleCase(spouseRole)} of ${mysteryChildRole(child)} ${fullName(child)}`);
          addMysteryFamilyNote(child, `${titleCase(mysteryChildRole(child))} of ${spouseRole} ${fullName(spouse)}`);
        }
      }
    }
    npcs.push(child);
    childRoom.occupantIds.push(child.id);
  }
  for (let index = 0; index < staffCount; index += 1) {
    const stationRoomId = pick(staffStations);
    const sex = nextResidentSex();
    const age = rand(RAVENWOOD_MIN_STAFF_AGE, RAVENWOOD_MAX_NPC_AGE);
    const portrait = chooseRavenwoodStaffPortrait({ sex, age, usedPortraitKeys, usedPortraitSignatures });
    const npc = makeMysteryNpc({
      role: "Staff",
      sex,
      age,
      ravenwoodPortraitKey: portrait?.key,
      portraitLineage: portrait?.lineage,
      visualRace: portrait?.visualRace,
      roomId: "servants-hall",
      stationRoomId
    }, usedNames, usedFirstNames, blockedFamilyNames);
    npcs.push(npc);
    rooms.find((room) => room.id === stationRoomId)?.occupantIds.push(npc.id);
  }
  buildMysteryNpcRelationshipPool(npcs, npcRelationships);
  npcRelationships.splice(0, npcRelationships.length, ...normalizeMysteryNpcRelationships(npcs, npcRelationships));
  const familySanityLines = repairMysteryFamilyGraphConsistency(npcs, npcRelationships, familyGraph);
  npcRelationships.splice(0, npcRelationships.length, ...normalizeMysteryNpcRelationships(npcs, npcRelationships));
  const profileSanityLines = repairMysteryNpcProfileConsistency(npcs, npcRelationships, [{
    id: "player",
    firstName: playerFirstName,
    familyName: playerFamilyName,
    sex: playerInput.sex,
    age: playerAge,
    ravenwoodPortraitKey: playerPortrait?.key,
    portraitLineage: playerPortrait?.lineage,
    visualRace: playerPortrait?.visualRace
  }]);
  const noiseSanityLines = repairMysteryRelationshipSignalToNoise({ npcs, npcRelationships, murders: [] });
  npcRelationships.splice(0, npcRelationships.length, ...normalizeMysteryNpcRelationships(npcs, npcRelationships));
  assignMysteryGuestRooms(rooms, npcs, npcRelationships, playerRoom.id);
  const openingServant = (npcs.find((npc) => npc.role === "Staff" && ["Butler", "Housekeeper", "Waiter", "Head waiter"].includes(npc.occupation)) ?? npcs.find((npc) => npc.role === "Staff"))!;
  if (openingServant) {
    const oldStation = rooms.find((room) => room.id === openingServant.stationRoomId);
    if (oldStation) oldStation.occupantIds = oldStation.occupantIds.filter((id) => id !== openingServant.id);
    openingServant.stationRoomId = "grand-hall";
    const greatHall = rooms.find((room) => room.id === "grand-hall");
    if (greatHall && !greatHall.occupantIds.includes(openingServant.id)) greatHall.occupantIds.push(openingServant.id);
  }
  const murderCount = rand(1, 3);
  const murders: MysteryMurder[] = [];
  const deadNpcIds = new Set<string>();
  const previousKillerIds: string[] = [];
  const murderSchedule = mysteryGeneratedMurderSchedule(murderCount);
  for (let index = 0; index < murderSchedule.length; index += 1) {
    const livingNpcs = npcs.filter((npc) => !deadNpcIds.has(npc.id));
    const repeatKillerIds = previousKillerIds.filter((id) => !deadNpcIds.has(id));
    const killer = repeatKillerIds.length > 0 && roll(0.65)
      ? npcs.find((npc) => npc.id === pick(repeatKillerIds)) ?? pick(livingNpcs)
      : pick(livingNpcs);
    const victim = pick(livingNpcs.filter((npc) => npc.id !== killer.id));
    const { day: murderDay, daytime } = murderSchedule[index];
    const method = pick(mysteryMethods);
    const methodRooms = mysteryRoomsForVictimMurder(method, rooms, playerRoom.id, victim);
    const room = pick(methodRooms.length > 0 ? methodRooms : rooms.filter((candidate) => candidate.id !== playerRoom.id && (candidate.kind !== "guest" || candidate.accessible)));
    const alternateRoom = mysteryFallbackRoomForMurder(method, rooms, room.id, playerRoom.id);
    const motive = mysteryMotiveFor(killer, victim, npcs, npcRelationships, murderDay, daytime, murders);
    murders.push({
      victimId: victim.id,
      killerId: killer.id,
      day: murderDay,
      daytime,
      roomId: room.id,
      alternateRoomId: alternateRoom?.id,
      method,
      motive,
      proof: "",
      proofs: [],
      discovered: false
    });
    deadNpcIds.add(victim.id);
    previousKillerIds.push(killer.id);
  }
  const scenarioSanityLines = repairMysteryMurderTimelineAndMotives(murders, npcs, npcRelationships);
  for (const murder of murders) {
    const killer = npcs.find((npc) => npc.id === murder.killerId);
    const victim = npcs.find((npc) => npc.id === murder.victimId);
    if (!killer || !victim) continue;
    const murderRoomName = rooms.find((room) => room.id === murder.roomId)?.name ?? "the murder room";
    const proofResult = mysteryProofsFor(murder.method, murder.motive, killer, victim, npcs, npcRelationships, murder.day, murder.daytime, murderRoomName);
    murder.proofs = proofResult.proofs;
    murder.proof = proofResult.proofs[0] ?? `Proof linking ${fullName(killer)} to ${fullName(victim)}'s death`;
    murder.witnessId = proofResult.witnessId;
    murder.witnessSummary = proofResult.witnessSummary;
  }
  const findables = mysteryFindablesForScenario(murders, npcs, rooms, npcRelationships);
  for (const [index, murder] of murders.entries()) {
    const exactProofs = findables
      .filter((findable) => findable.kind === "Proof" && findable.relatedMurderIndex === index && findable.proofText)
      .map((findable) => findable.proofText as string);
    if (exactProofs.length > 0) {
      const witness = murder.witnessId ? npcs.find((npc) => npc.id === murder.witnessId) : undefined;
      const witnessLine = murder.witnessSummary && witness ? `${murder.witnessSummary}, but ${mysteryWitnessAccessText(witness)}.` : undefined;
      murder.proofs = witnessLine ? [...exactProofs, witnessLine] : exactProofs;
      murder.proof = exactProofs[0];
    }
  }
  npcRelationships.splice(0, npcRelationships.length, ...normalizeMysteryNpcRelationships(npcs, npcRelationships));
  const finalFamilySanityLines = repairMysteryFamilyGraphConsistency(npcs, npcRelationships, familyGraph);
  npcRelationships.splice(0, npcRelationships.length, ...normalizeMysteryNpcRelationships(npcs, npcRelationships));
  const finalProfileSanityLines = repairMysteryNpcProfileConsistency(npcs, npcRelationships, [{
    id: "player",
    firstName: playerFirstName,
    familyName: playerFamilyName,
    sex: playerInput.sex,
    age: playerAge,
    ravenwoodPortraitKey: playerPortrait?.key,
    portraitLineage: playerPortrait?.lineage,
    visualRace: playerPortrait?.visualRace
  }]);
  const finalNoiseSanityLines = repairMysteryRelationshipSignalToNoise({ npcs, npcRelationships, murders });
  npcRelationships.splice(0, npcRelationships.length, ...normalizeMysteryNpcRelationships(npcs, npcRelationships));
  const lockdownReason = pick(mysteryLockdownReasons);
  const mysteryId = uid();
  const inventory = [`key to ${playerRoom.name}`, "travel bag", "notebook", "pencil"];
  if (playerFirstName === "Mira") inventory.push("deck of cards");
  const arrivalGreetingText = `${openingServant.firstName} ${openingServant.familyName} - a ${openingServant.occupation.toLowerCase()} - greets you in the Great Hall and explains that ${lockdownReason}; no one is leaving Ravenwood Manor for the foreseeable future.`;
  const arrivalKeyText = `${playerFirstName} ${playerFamilyName} receives a brass key for ${playerRoom.name}. WIFI is down, and phone service is not working.`;
  const arrivalNotebookText = "Your notebook opens to a blank page. The residents are already choosing which truths to hide.";
  const arrivalEntries: MysteryArrivalPopup["entries"] = [
    { id: uid(), title: "Staff Greeting", text: arrivalGreetingText, portraitNpcId: openingServant.id },
    { id: uid(), title: "Room Key", text: arrivalKeyText, icon: "key" },
    { id: uid(), title: "First Page", text: arrivalNotebookText, icon: "book" }
  ];
  const mystery: MysteryGame = {
    id: mysteryId,
    title: "Ravenwood Murder Mystery",
    player: {
      id: uid(),
      firstName: playerFirstName,
      familyName: playerFamilyName,
      sex: playerInput.sex,
      origin: playerInput.origin,
      hairStyle: playerInput.hairStyle,
      hairColor: playerInput.hairColor,
      faceTrait: playerInput.faceTrait ?? initialDraft.faceTrait,
      age: playerAge,
      detectiveId: detectiveProfile?.id,
      ravenwoodPortraitKey: playerPortrait?.key,
      portraitLineage: playerPortrait?.lineage,
      visualRace: playerPortrait?.visualRace
},
day: 1,
daytime: "Morning",
rooms,
npcs,
npcRelationships,
familyGraph,
murders,
findables,
currentRoomId: "grand-hall",
playerRoomId: playerRoom.id,
messages: [
  {
    id: uid(),
    speaker: "GM",
    text: arrivalGreetingText,
    portraitNpcId: openingServant.id,
  },
  {
    id: uid(),
    speaker: "GM",
    text: arrivalKeyText,
    icon: "key",
  },
  {
    id: uid(),
    speaker: "GM",
    text: arrivalNotebookText,
    icon: "book",
  },
],
journal: [],
journalNotes: "",
sanityLedger: [],
aiMemory: [],
aiConversationSummaries: [],
npcConversationMemory: {},
discoveredProof: [],
inventory,
medalEvents: [],
finished: false,
won: false,
pendingArrivalPopup: { entries: arrivalEntries },
  };
  return validateAndRepairMysteryBeforeStart(mystery, [
    ...familySanityLines,
    ...profileSanityLines,
    ...noiseSanityLines,
    ...scenarioSanityLines,
    ...finalFamilySanityLines,
    ...finalProfileSanityLines,
    ...finalNoiseSanityLines
  ]);
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [themeName, setThemeName] = useState<ThemeName>("dark");
  const [draft, setDraft] = useState<CharacterDraft>(initialDraft);
  const [mysteries, setMysteries] = useState<MysteryGame[]>([]);
  const [activeMysteryId, setActiveMysteryId] = useState<string | null>(null);
  const [mysteryJournalBackScreen, setMysteryJournalBackScreen] = useState<Screen>("mystery");
  const [selectedMysteryDetectiveId, setSelectedMysteryDetectiveId] = useState(ravenwoodDetectiveProfiles[0].id);
  const [selectedMysteryDetectiveAge, setSelectedMysteryDetectiveAge] = useState(24);
  const [focusedMysteryNpcId, setFocusedMysteryNpcId] = useState<string | null>(null);
  const [selectedMysteryTreeNpcId, setSelectedMysteryTreeNpcId] = useState<string | null>(null);
  const [draggingMysteryItem, setDraggingMysteryItem] = useState<string | null>(null);
  const [draggingMysteryNpcId, setDraggingMysteryNpcId] = useState<string | null>(null);
  const [mysteryInput, setMysteryInput] = useState("");
  const [mysteryAiThinking, setMysteryAiThinking] = useState(false);
  const [ravenwoodAiStatus, setRavenwoodAiStatus] = useState<RavenwoodModelStatus | null>(null);
  const [ravenwoodAiTestInput, setRavenwoodAiTestInput] = useState("Ask Nadine what she noticed after dinner.");
  const [ravenwoodAiTestOutput, setRavenwoodAiTestOutput] = useState("");
  const [expandedMysteryArchiveDays, setExpandedMysteryArchiveDays] = useState<Record<number, boolean>>({});
  const [mysteryTreeViewport, setMysteryTreeViewport] = useState({ width: 0, height: 0 });
  const [solveMurderIndex, setSolveMurderIndex] = useState<number | null>(null);
  const [accusationKillerId, setAccusationKillerId] = useState<string | null>(null);
  const [accusationProofName, setAccusationProofName] = useState<string | null>(null);
  const [accusationMotiveText, setAccusationMotiveText] = useState("");
  const [accusationDropdown, setAccusationDropdown] = useState<"killer" | "proof" | null>(null);
  const [accusationFeedback, setAccusationFeedback] = useState<{ title: string; text: string; mode: "victory" | "warning" | "loss"; triggerDeath?: boolean } | null>(null);
  const mysteryRelationsScrollRef = useRef<ScrollView | null>(null);
  const mysteryRelationsScrollYRef = useRef(0);
  const restoreMysteryRelationsScrollRef = useRef(false);
  const mysteryTreeHorizontalRef = useRef<ScrollView | null>(null);
  const mysteryTreeVerticalRef = useRef<ScrollView | null>(null);
  const mysteryTreeSelectedCenterRef = useRef<{ x: number; y: number; canvasWidth: number; canvasHeight: number } | null>(null);
  const mysteryTreePressRef = useRef<{ npcId: string; time: number } | null>(null);
  const medalPressRef = useRef<{ medalId: MysteryMedalId; mysteryId: string; time: number } | null>(null);
  const mysteryTreeSinglePressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detectiveCarouselRef = useRef<ScrollView | null>(null);
  const detectiveCarouselOffsetRef = useRef(0);
  const mysteryPageScrollRef = useRef<ScrollView | null>(null);
  const storyScrollRef = useRef<ScrollView | null>(null);
  const scrollStoryTopFromCompassRef = useRef(false);
  const storyMessageOffsetsRef = useRef<Record<string, number>>({});
  const compassGlow = useRef(new Animated.Value(0)).current;
  const mapFogMotion = useRef(new Animated.Value(0)).current;
  const C = themes[themeName];
  const activeMystery = useMemo(() => mysteries.find((mystery) => mystery.id === activeMysteryId) ?? null, [activeMysteryId, mysteries]);
  const activeMysteryVisibleMessageKey = activeMystery?.messages.slice(-5).map((message) => message.id).join("|") ?? "";
  const selectedMysteryDetective = useMemo(
    () => ravenwoodDetectiveProfiles.find((profile) => profile.id === selectedMysteryDetectiveId) ?? ravenwoodDetectiveProfiles[0],
    [selectedMysteryDetectiveId]
  );

  useEffect(() => {
    setMysteries((current) => current.map((mystery) => {
      const cleaned = cleanMysteryNameEncoding(mystery);
      const npcs = cleaned.npcs.map((npc) => ({ ...npc }));
      repairMysteryReasonContext(npcs, cleaned.npcRelationships, []);
      return { ...cleaned, npcs, sanityLedger: [] };
    }));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    const html = document.documentElement;
    const body = document.body;
    const previousScrollRestoration = window.history.scrollRestoration;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlHeight = html.style.height;
    const previousBodyHeight = body.style.height;
    window.history.scrollRestoration = "manual";
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.height = "100%";
    body.style.height = "100%";
    scrollBrowserWindowToTop();
    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      html.style.height = previousHtmlHeight;
      body.style.height = previousBodyHeight;
    };
  }, []);

  useEffect(() => {
    scrollBrowserWindowToTop();
  }, [screen, activeMysteryId]);

  useEffect(() => {
    storyMessageOffsetsRef.current = {};
  }, [activeMysteryVisibleMessageKey]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(compassGlow, { toValue: 1, duration: 760, useNativeDriver: true }),
        Animated.timing(compassGlow, { toValue: 0.35, duration: 420, useNativeDriver: true }),
        Animated.timing(compassGlow, { toValue: 0.82, duration: 540, useNativeDriver: true }),
        Animated.timing(compassGlow, { toValue: 0.15, duration: 880, useNativeDriver: true })
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [compassGlow]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(mapFogMotion, { toValue: 1, duration: 1900, useNativeDriver: true }),
        Animated.timing(mapFogMotion, { toValue: 0, duration: 2300, useNativeDriver: true })
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [mapFogMotion]);

  useEffect(() => {
    if (screen !== "mystery" || !activeMystery?.storyFocusMessageId) return;
    const timer = setTimeout(() => {
      const offset = storyMessageOffsetsRef.current[activeMystery.storyFocusMessageId ?? ""];
      storyScrollRef.current?.scrollTo({ y: Math.max(0, offset ?? 0), animated: true });
    }, 80);
    return () => clearTimeout(timer);
  }, [screen, activeMystery?.storyFocusMessageId, activeMysteryVisibleMessageKey]);

  useEffect(() => {
    if (screen !== "mystery" || !scrollStoryTopFromCompassRef.current) return;
    const timer = setTimeout(() => {
      mysteryPageScrollRef.current?.scrollTo({ y: 0, animated: true });
      storyScrollRef.current?.scrollTo({ y: 0, animated: true });
      scrollStoryTopFromCompassRef.current = false;
    }, 80);
    return () => clearTimeout(timer);
  }, [screen, activeMysteryVisibleMessageKey]);

  useEffect(() => {
    let cancelled = false;
    if (screen !== "mystery") return;
    getRavenwoodModelStatus().then((status) => {
      if (!cancelled) setRavenwoodAiStatus(status);
    });
    return () => {
      cancelled = true;
    };
  }, [screen]);

  useEffect(() => {
    if (screen !== "mysteryFamilyTree" || !activeMystery || mysteryTreeViewport.width <= 0 || mysteryTreeViewport.height <= 0) return;
    const selected = mysteryTreeSelectedCenterRef.current;
    if (!selected) return;
    const x = clamp(selected.x - mysteryTreeViewport.width / 2, 0, Math.max(0, selected.canvasWidth - mysteryTreeViewport.width));
    const y = clamp(selected.y - mysteryTreeViewport.height / 2, 0, Math.max(0, selected.canvasHeight - mysteryTreeViewport.height));
    const timer = setTimeout(() => {
      mysteryTreeHorizontalRef.current?.scrollTo({ x, y: 0, animated: false });
      mysteryTreeVerticalRef.current?.scrollTo({ x: 0, y, animated: false });
    }, 80);
    return () => clearTimeout(timer);
  }, [screen, activeMystery?.id, selectedMysteryTreeNpcId, mysteryTreeViewport.width, mysteryTreeViewport.height]);

  useEffect(() => {
    if (screen !== "mysteryRelations" || !restoreMysteryRelationsScrollRef.current) return;
    const y = mysteryRelationsScrollYRef.current;
    const timer = setTimeout(() => {
      mysteryRelationsScrollRef.current?.scrollTo({ x: 0, y, animated: false });
      restoreMysteryRelationsScrollRef.current = false;
    }, 80);
    return () => clearTimeout(timer);
  }, [screen, activeMystery?.id]);

  useEffect(() => {
    return () => {
      if (mysteryTreeSinglePressTimerRef.current) clearTimeout(mysteryTreeSinglePressTimerRef.current);
    };
  }, []);

  function chooseMysteryDetective(profileId: string) {
    const scrollX = detectiveCarouselOffsetRef.current;
    setSelectedMysteryDetectiveId(profileId);
    setSelectedMysteryDetectiveAge(24);
    requestAnimationFrame(() => {
      detectiveCarouselRef.current?.scrollTo({ x: scrollX, y: 0, animated: false });
    });
  }

  function confirmMysteryDetective() {
    setSelectedMysteryDetectiveAge(24);
    setScreen("mysteryPortraitSelect");
  }

  function startMystery() {
    const mystery = createMysteryGameFromDraft(draft, selectedMysteryDetective, selectedMysteryDetectiveAge);
    setMysteries((current) => [mystery, ...current]);
    setActiveMysteryId(mystery.id);
    setMysteryInput("");
    setScreen("mystery");
  }

  function patchMystery(mutator: (mystery: MysteryGame) => MysteryGame) {
    setMysteries((current) => current.map((mystery) => {
      const cleaned = { ...mystery, sanityLedger: [] };
      return mystery.id === activeMysteryId ? { ...mutator(cleaned), sanityLedger: [] } : cleaned;
    }));
  }

  function mysteryRoomName(mystery: MysteryGame, roomId: string): string {
    return mystery.rooms.find((room) => room.id === roomId)?.name ?? titleCase(roomId.replace(/-/g, " "));
  }

  function mysteryNpcName(mystery: MysteryGame, npcId: string): string {
    const npc = mystery.npcs.find((candidate) => candidate.id === npcId);
    return npc ? fullName(npc) : "Unknown";
  }

  function mysteryPlayerHasKeyForRoom(mystery: MysteryGame, room: MysteryRoom): boolean {
    if (room.accessible || room.kind === "public" || room.id === mystery.playerRoomId) return true;
    const roomNameText = room.name.toLowerCase();
    const roomIdText = room.id.replace(/-/g, " ");
    return mystery.inventory.some((item) => {
      const lower = item.toLowerCase();
      if ((lower.includes("master key") || lower.includes("master room key")) && room.kind === "guest") return true;
      if (lower.includes("grand hall service key") && (room.kind === "staff" || room.kind === "service")) return true;
      if (!lower.includes("key")) return false;
      return lower.includes(roomNameText) || lower.includes(roomIdText);
    });
  }

  function mysteryInventoryKeyForRoom(inventory: string[], room: MysteryRoom): string | undefined {
    if (room.kind === "public") return undefined;
    const roomNameText = room.name.toLowerCase();
    const roomIdText = room.id.replace(/-/g, " ");
    return inventory.find((item) => {
      const lower = item.toLowerCase();
      if (!lower.includes("key")) return false;
      if ((lower.includes("master key") || lower.includes("master room key")) && room.kind === "guest") return true;
      if (lower.includes("grand hall service key") && (room.kind === "staff" || room.kind === "service")) return true;
      return lower.includes(roomNameText) || lower.includes(roomIdText);
    });
  }

  function mysteryPlayerHasLockpickingTools(mystery: MysteryGame): boolean {
    return mystery.inventory.some((item) => mysteryInventoryIconFor(item) === "lockpicks");
  }

  function mysteryRemoveOneInventoryItem(inventory: string[], item: string): string[] {
    let removed = false;
    return inventory.filter((candidate) => {
      if (!removed && candidate === item) {
        removed = true;
        return false;
      }
      return true;
    });
  }

  function mysteryPendingWitnessInviteForRoom(mystery: MysteryGame, room: MysteryRoom): MysteryNpc | undefined {
    return mystery.npcs.find((npc) =>
      npc.alive &&
      mystery.witnessInvitationNpcIds?.includes(npc.id) &&
      !mystery.witnessKnowledgeDeliveredNpcIds?.includes(npc.id) &&
      mysteryPrivateMeetingRoomIdFor(npc) === room.id
    );
  }

  function mysteryPlayerCanAccessRoom(mystery: MysteryGame, room: MysteryRoom): boolean {
    return room.accessible || room.kind === "public" || room.id === mystery.playerRoomId || mysteryPlayerHasKeyForRoom(mystery, room) || Boolean(mysteryPendingWitnessInviteForRoom(mystery, room));
  }

  function mysteryAccessInviteAvailable(mystery: MysteryGame, room: MysteryRoom): { byTrust: boolean; byRomance: boolean; npc?: MysteryNpc } {
    const people = mystery.npcs.filter((npc) => npc.alive && currentMysteryNpcRoomId(mystery, npc) === room.id);
    const trusted = people.find((npc) => effectiveMysteryTrust(npc) >= 70);
    const romantic = people.find((npc) => mysteryCanPlayerHaveRomanceWithNpc(mystery.player, npc) && npc.romanceRevealed && npc.romance >= 65);
    return { byTrust: Boolean(trusted), byRomance: Boolean(romantic), npc: trusted ?? romantic };
  }

  function mysteryResolveRoomAccessAttempt(text: string, mystery: MysteryGame, room: MysteryRoom, rollResult?: MysteryRollOutcome): { allowed: boolean; room: MysteryRoom; message?: StoryMessage; ledger: string } {
    if (mysteryPlayerHasKeyForRoom(mystery, room)) {
      const opened = { ...room, accessible: true };
      return { allowed: true, room: opened, ledger: `Access granted to ${room.name}: player has a matching key.` };
    }
    const witnessInvite = mysteryPendingWitnessInviteForRoom(mystery, room);
    if (witnessInvite) {
      const line = `${fullName(witnessInvite)} is waiting for you in ${room.name}; they asked for this private meeting.`;
      return { allowed: true, room: { ...room, accessible: true }, message: { id: uid(), speaker: "GM", text: line, rich: mysteryNpcSegments(line, mystery) }, ledger: `Access granted to ${room.name}: pending witness invitation from ${fullName(witnessInvite)}.` };
    }
    const lower = text.toLowerCase();
    const invite = mysteryAccessInviteAvailable(mystery, room);
    if (invite.byTrust || invite.byRomance) {
      const reason = invite.byRomance ? "romance" : "trust";
      const line = `${invite.npc ? fullName(invite.npc) : "Someone nearby"} quietly helps you into ${room.name} because ${reason} is high enough.`;
      return { allowed: true, room: { ...room, accessible: true }, message: { id: uid(), speaker: "GM", text: line }, ledger: `Access granted to ${room.name} by high ${reason}.` };
    }
    if (lower.match(/\b(knock|rap|tap)\b/)) {
      const inside = mysteryPeopleInRoom(mystery, room.id).filter((person) => person.id !== mystery.player.id) as MysteryNpc[];
      if (inside.length === 0) {
        return { allowed: false, room, message: { id: uid(), speaker: "GM", text: `You knock at ${room.name}, but nobody answers.` }, ledger: `Access denied to ${room.name}: knock received no answer.` };
      }
      const answerer = [...inside].sort((a, b) => effectiveMysteryTrust(b) - effectiveMysteryTrust(a))[0];
      if (answerer && (effectiveMysteryTrust(answerer) >= 45 || mysteryRollMeets(rollResult, "medium"))) {
        const line = `${fullName(answerer)} opens the door after a careful pause and lets you into ${room.name}.`;
        return { allowed: true, room: { ...room, accessible: true }, message: { id: uid(), speaker: "GM", text: line, roll: mysteryRollText(rollResult), rich: mysteryNpcSegments(line, mystery) }, ledger: `Access granted to ${room.name}: ${fullName(answerer)} answered the knock.` };
      }
      const names = inside.slice(0, 2).map(fullName).join(", ");
      const line = `${names} ${inside.length === 1 ? "answers" : "answer"} from behind the door, but nobody invites you in.`;
      return { allowed: false, room, message: { id: uid(), speaker: "GM", text: line, roll: mysteryRollText(rollResult), rich: mysteryNpcSegments(line, mystery) }, ledger: `Access denied to ${room.name}: knock answered without invitation.` };
    }
    if (lower.match(/\b(lockpick|pick the lock|unlock|force the lock)\b/)) {
      if (!mysteryPlayerHasLockpickingTools(mystery)) return { allowed: false, room, message: { id: uid(), speaker: "GM", text: `You need lock-picking tools before you can work on ${room.name}'s lock.`, roll: mysteryRollText(rollResult) }, ledger: `Access denied to ${room.name}: no lock-picking tools.` };
      if (mysteryRollMeets(rollResult, "hard")) return { allowed: true, room: { ...room, accessible: true }, message: { id: uid(), speaker: "GM", text: `The lock gives after careful work. ${room.name} is open to you for now.`, roll: mysteryRollText(rollResult) }, ledger: `Access granted to ${room.name} by lockpick.` };
      return { allowed: false, room, message: { id: uid(), speaker: "GM", text: `${room.name} stays locked. The lock needs a clean Sleight of Hand result.`, roll: mysteryRollText(rollResult) }, ledger: `Access denied to ${room.name}: lockpick failed.` };
    }
    if (lower.match(/\b(sneak|slip in|wait for .*leave|wait until .*leaves|follow .*inside|tail .*inside)\b/)) {
      if (mysteryRollMeets(rollResult, "medium")) return { allowed: true, room: { ...room, accessible: true }, message: { id: uid(), speaker: "GM", text: `You wait for the right footstep and slip into ${room.name} without making an announcement.`, roll: mysteryRollText(rollResult) }, ledger: `Access granted to ${room.name} by sneak.` };
      return { allowed: false, room, message: { id: uid(), speaker: "GM", text: `The timing is wrong. Someone would see you enter ${room.name}.`, roll: mysteryRollText(rollResult) }, ledger: `Access denied to ${room.name}: sneak failed.` };
    }
    return { allowed: false, room, message: { id: uid(), speaker: "GM", text: `${room.name} is locked. You need a key, a quiet entry, lockpicking, or help from someone who trusts you enough.` }, ledger: `Access denied to ${room.name}: no key or successful access route.` };
  }

  function effectiveMysteryTrust(npc: MysteryNpc): number {
    return clamp(npc.trust + (npc.temporaryTrust ?? 0), 0, 100);
  }

  function readableMysterySecret(secret: string): string {
    return secret
      .replace(/\{linked_character\}/gi, "another resident")
      .replace(/secretly changed room keys before arrival/gi, "requested a room change at arrival")
      .replace(/secretly changed room keys/gi, "requested a room change")
      .replace(/changed room keys before arrival/gi, "requested a room change at arrival");
  }

  function mysteryResidentSecretLines(npc: MysteryNpc, mystery: Pick<MysteryGame, "murders" | "npcs">): string[] {
    const murderVictimNames = [...(mystery.murders ?? [])]
      .filter((murder) => murder.killerId === npc.id)
      .sort((a, b) => mysteryTimeSortValue(a.day, a.daytime) - mysteryTimeSortValue(b.day, b.daytime))
      .map((murder) => mystery.npcs.find((candidate) => candidate.id === murder.victimId))
      .filter((victim): victim is MysteryNpc => Boolean(victim))
      .map(fullName);
    const murderLines = murderVictimNames.map((victimName, index) =>
      index === 0 && murderVictimNames.length > 1
        ? `Killed ${victimName} and is hiding evidence of the earlier murder.`
        : `Killed ${victimName}.`
    );
    const readable = readableMysterySecret(npc.secret);
    if (murderLines.length === 0) return [readable].filter(Boolean);
    if (readable && !/^killed\b/i.test(readable) && !murderLines.some((line) => line.toLowerCase() === readable.toLowerCase())) {
      return [...murderLines, readable];
    }
    return murderLines;
  }

  function mysteryNpcSleepRoomId(npc: MysteryNpc): string {
    return npc.roomId;
  }

  function mysteryNpcIsSleeping(mystery: Pick<MysteryGame, "id" | "day" | "daytime">, npc: MysteryNpc): boolean {
    if (!npc.alive) return false;
    const mainSleepRoll = stableHash(`${mystery.id}-${mystery.day}-${npc.id}-main-sleep`) % 100;
    const previousSleepRoll = stableHash(`${mystery.id}-${Math.max(1, mystery.day - 1)}-${npc.id}-main-sleep`) % 100;
    const napRoll = stableHash(`${mystery.id}-${mystery.day}-${npc.id}-nap`) % 100;
    if (mystery.daytime === "Midnight") return mainSleepRoll < (npc.role === "Staff" ? 72 : 84);
    if (mystery.daytime === "Night") return mainSleepRoll < (npc.role === "Staff" ? 34 : 48);
    if (mystery.daytime === "Morning") return previousSleepRoll < (npc.role === "Staff" ? 18 : 28);
    if (mystery.daytime === "Afternoon") return napRoll < (npc.age >= 55 || npc.isChild ? 16 : 7);
    return false;
  }

  function currentMysteryNpcRoomId(
    mystery: Pick<MysteryGame, "id" | "day" | "daytime"> & Partial<Pick<MysteryGame, "currentRoomId" | "conversationNpcId" | "conversationRoomId" | "witnessInvitationNpcIds" | "witnessKnowledgeDeliveredNpcIds">>,
    npc: MysteryNpc
  ): string {
    if (!npc.alive) return npc.role === "Guest" ? npc.roomId : npc.stationRoomId;
    if (mystery.conversationNpcId === npc.id && mystery.conversationRoomId) return mystery.conversationRoomId;
    if (
      mystery.currentRoomId &&
      mystery.witnessInvitationNpcIds?.includes(npc.id) &&
      !mystery.witnessKnowledgeDeliveredNpcIds?.includes(npc.id)
    ) {
      return mystery.currentRoomId;
    }
    if (mysteryNpcIsSleeping(mystery, npc)) return mysteryNpcSleepRoomId(npc);
    if (npc.role === "Staff") {
      const dutyRoll = stableHash(`${mystery.id}-${mystery.day}-${mystery.daytime}-${npc.id}-station-duty`) % 100;
      const workTime = ["Morning", "Breakfast", "Midday", "Lunch", "Afternoon", "Evening"].includes(mystery.daytime);
      if (workTime && dutyRoll < (mystery.daytime === "Evening" ? 68 : 84)) return npc.stationRoomId;
      if ((mystery.daytime === "Night" || mystery.daytime === "Midnight") && dutyRoll < 24) return npc.stationRoomId;
    }
    if (ravenwoodMealTimes.includes(mystery.daytime) && npc.age >= 13) return "dining-room";
    if (npc.substanceState === "drunk" && ravenwoodDrinkTimes.includes(mystery.daytime)) return pickByHash(ravenwoodSocialRooms, `${mystery.id}-${mystery.day}-${mystery.daytime}-${npc.id}-drunk`);
    const substancePreference = mysteryDisplaySubstancePreference(npc);
    if (npc.substanceState === "high" || substancePreference.includes("cigarettes") || substancePreference.includes("weed")) {
      const smokeRoll = stableHash(`${mystery.id}-${mystery.day}-${mystery.daytime}-${npc.id}-smoke`) % 100;
      if (smokeRoll < 38 && (mystery.daytime === "Afternoon" || mystery.daytime === "Evening" || mystery.daytime === "Night")) return "smoking-room";
    }
    const driftChance = npc.role === "Guest" ? 62 : 22;
    const driftRoll = stableHash(`${mystery.id}-${mystery.day}-${mystery.daytime}-${npc.id}-room`) % 100;
    if (driftRoll < driftChance) return pickByHash(ravenwoodSocialRooms, `${mystery.id}-${mystery.day}-${mystery.daytime}-${npc.id}-social-room`);
    return npc.role === "Guest" ? npc.roomId : npc.stationRoomId;
  }

  function mysteryMurderRoomComposureDifficulty(mystery: MysteryGame, murder: MysteryMurder): MysteryRollOutcome["tier"] {
    if (mystery.daytime === "Night" || mystery.daytime === "Midnight") return "hard";
    if (!murder.discovered) return "hard";
    return "medium";
  }

  function mysteryPrivateRoomOccupantsAt(mystery: MysteryGame, roomId: string): MysteryNpc[] {
    return mystery.npcs.filter((npc) => {
      if (!npc.alive) return false;
      const privateRoomId = npc.role === "Guest" ? npc.roomId : npc.stationRoomId;
      return privateRoomId === roomId && currentMysteryNpcRoomId(mystery, npc) === roomId;
    });
  }

  function mysteryIsWaitOrHideText(text: string): boolean {
    return /\b(wait|stay still|keep still|hide|remain hidden|hold breath|cupboard|wardrobe|closet)\b/i.test(text);
  }

  function mysteryPeopleInRoom(mystery: MysteryGame, roomId: string) {
    const mealTime = mystery.daytime === "Breakfast" || mystery.daytime === "Lunch";
    const people = [];
    if (roomId === mystery.currentRoomId) {
      people.push({
        id: mystery.player.id,
        firstName: mystery.player.firstName,
        familyName: mystery.player.familyName,
        sex: mystery.player.sex,
        age: mysteryPlayerAge(mystery.player),
        ravenwoodPortraitKey: mystery.player.ravenwoodPortraitKey,
        portraitLineage: mystery.player.portraitLineage,
        visualRace: mystery.player.visualRace,
        alive: true
      });
    }
    people.push(...mystery.npcs.filter((npc) => {
      if (!npc.alive) return false;
      if (mealTime && stableHash(`${mystery.id}-${mystery.day}-${mystery.daytime}-${npc.id}`) % 100 >= (npc.role === "Guest" ? 82 : 35)) {
        return currentMysteryNpcRoomId(mystery, npc) === roomId;
      }
      return currentMysteryNpcRoomId(mystery, npc) === roomId;
    }));
    return people;
  }

  function mysteryPrivateMeetingRoomIdFor(npc: MysteryNpc): string {
    return npc.role === "Guest" ? npc.roomId : npc.stationRoomId;
  }

  function mysteryWitnessRelationshipAvailable(mystery: MysteryGame, relationship: MysteryNpcRelationship): boolean {
    if (relationship.kind !== "Witness") return false;
    if (!relationship.availableDay || !relationship.availableDaytime) return true;
    return mysteryTimeHasArrived(mystery.day, mystery.daytime, relationship.availableDay, relationship.availableDaytime);
  }

  function mysteryWitnessKnowledgeLinesFor(mystery: MysteryGame, witness: MysteryNpc): string[] {
    return (mystery.npcRelationships ?? [])
      .filter((relationship) =>
        relationship.kind === "Witness" &&
        relationship.fromId === witness.id &&
        mysteryWitnessRelationshipAvailable(mystery, relationship)
      )
      .map((relationship) => relationship.detail
        .replace(new RegExp(`, but ${escapeRegExp(fullName(witness))} won't tell.*$`, "i"), ".")
        .replace(/\.\.+$/g, ".")
      );
  }

  function mysteryWitnessInvitationResolution(
    mystery: MysteryGame,
    nextNpcs: MysteryNpc[],
    currentRoomId: string,
    invitedIds: string[],
    deliveredIds: string[]
  ): { invitedIds: string[]; messages: StoryMessage[]; ledgerLines: string[] } {
    const invited = new Set(invitedIds);
    const delivered = new Set(deliveredIds);
    const messages: StoryMessage[] = [];
    const ledgerLines: string[] = [];
    const nextMystery = { ...mystery, npcs: nextNpcs, currentRoomId };
    for (const npc of nextNpcs) {
      if (!npc.alive || invited.has(npc.id) || delivered.has(npc.id)) continue;
      if (effectiveMysteryTrust(npc) < 75 && (!mysteryCanPlayerHaveRomanceWithNpc(mystery.player, npc) || npc.romance < 75)) continue;
      const knowledgeLines = mysteryWitnessKnowledgeLinesFor(nextMystery, npc);
      if (knowledgeLines.length === 0) continue;
      const privateRoomId = mysteryPrivateMeetingRoomIdFor(npc);
      const privateRoomName = mysteryRoomName(nextMystery, privateRoomId);
      const currentRoomName = mysteryRoomName(nextMystery, currentRoomId);
      const line = `${fullName(npc)} finds you in ${currentRoomName}. "Please, not here. Meet me in ${privateRoomName} right away, in private. I know something about the murder."`;
      messages.push({ id: uid(), speaker: "GM", text: line, rich: mysteryNpcSegments(line, nextMystery) });
      ledgerLines.push(`Witness invitation triggered: ${fullName(npc)} reached trust/romance threshold and requested a private meeting in ${privateRoomName}.`);
      invited.add(npc.id);
    }
    return { invitedIds: Array.from(invited), messages, ledgerLines };
  }

  function nextMysteryTime(day: number, daytime: Daytime): { day: number; daytime: Daytime } {
    const index = daytimes.indexOf(daytime);
    if (index >= daytimes.length - 1) return { day: day + 1, daytime: "Morning" };
    return { day, daytime: daytimes[index + 1] };
  }

  function mysteryCheckKindForText(text: string): MysteryCheckKind | undefined {
    const lower = text.toLowerCase();
    if (lower.match(/\b(flirt|romance|romantic|kiss|date|dance|seduce|wink|blush)\b/)) return "Rizz";
    if (lower.match(/\b(pickpocket|palm|steal|snatch|plant|lockpick|pick the lock|unlock|sleight|conceal)\b/)) return "Sleight of Hand";
    if (lower.match(/\b(sneak|hide|follow|tail|shadow|slip past|crawl|quiet|eavesdrop)\b/)) return "Stealth";
    if (lower.match(/\b(lie|bluff|deceive|trick|mislead|pretend|fake|cover story|disguise)\b/)) return "Deception";
    if (lower.match(/\b(persuade|persuation|persuasion|convince|promise|negotiate|reason|plead|appeal|argue)\b/)) return "Persuasion";
    if (lower.match(/\b(charm|command|impress|confidence|talk|greet|socialize|speak|ask|question|interview|accuse|arrest|knock|rap|tap)\b/)) return "Charisma";
    if (lower.match(/\b(body|corpse|blood|death|dead|wound|poison|illness|medicine|medical|doctor|examine|heal|treat)\b/)) return "Medicine";
    if (lower.match(/\b(history|remember|recall|archive|record|ledger|family tree|lineage|antique|old story|date|guest book)\b/)) return "History";
    if (lower.match(/\b(search|investigate|proof|evidence|listen|inspect|study|look|read|trace|clue|find)\b/)) return "Search";
    if (lower.match(/\b(fear|panic|storm|midnight|wait|watch|endure|calm|pressure|threat|threaten)\b/)) return "Composure";
    if (lower.match(/\b(force|attack|kill|fight|break|push|strike|shove|shoot|stab|run|chase|climb|carry|jump|swim|athletic)\b/)) return "Athletics";
    return undefined;
  }

  function mysteryRollOutcome(text: string, mystery: MysteryGame): MysteryRollOutcome | undefined {
    const check = mysteryCheckKindForText(text);
    if (!check) return undefined;
    const die = rand(1, 12);
    const result = die;
    const tier = result >= 10 ? "hard" : result >= 6 ? "medium" : result >= 3 ? "easy" : "failed";
    return { check, die, total: result, tier };
  }

  function mysterySpecificRollOutcome(check: MysteryCheckKind, mystery: MysteryGame): MysteryRollOutcome {
    const die = rand(1, 12);
    const result = die;
    const tier = result >= 10 ? "hard" : result >= 6 ? "medium" : result >= 3 ? "easy" : "failed";
    return { check, die, total: result, tier };
  }

  function mysteryRollText(rollResult?: MysteryRollOutcome): string | undefined {
    if (!rollResult) return undefined;
    return `Roll: ${rollResult.check} d12 ${rollResult.die} = ${rollResult.total} (${rollResult.tier})`;
  }

  function mysteryPlayerFacingFindableName(findable: MysteryFindable): string {
    return mysteryFindablePlayerFacingNameValue(findable);
  }

  function mysteryFindableDiscoveryDescription(findable: MysteryFindable): string {
    return mysteryFindablePlayerFacingDescriptionValue(findable);
  }

  function mysteryRollMeets(rollResult: MysteryRollOutcome | undefined, tier: MysteryRollOutcome["tier"]): boolean {
    if (!rollResult) return false;
    const needed = tier === "hard" ? 10 : tier === "medium" ? 6 : tier === "easy" ? 3 : 2;
    return rollResult.total >= needed;
  }

  function mysteryRollBotched(rollResult: MysteryRollOutcome | undefined): boolean {
    return Boolean(rollResult && rollResult.total <= 1);
  }

  function mysteryRollAttemptKey(text: string, mystery: MysteryGame, check: MysteryCheckKind, roomId: string): string {
    const lower = text.toLowerCase();
    const roomIntent = detectMysteryRoomIntent(text, mystery);
    const target = mysteryTargetNpc(text, mystery, roomId) ?? mystery.npcs.find((npc) => mysteryTextMentionsNpc(lower, npc));
    const action = lower.match(/\b(lockpick|pick the lock|unlock)\b/)
      ? "lockpick"
      : lower.match(/\b(sneak|hide|slip past|eavesdrop|follow|tail|shadow)\b/)
        ? "sneak"
        : lower.match(/\b(steal|snatch|pickpocket|lift|palm|take .*from|borrow .*without)\b/)
          ? "steal"
          : lower.match(/\b(accuse|arrest)\b/)
            ? "accuse"
            : mysterySpeechIntent(text)
              ? `talk-${mysteryToneForText(text)}`
              : lower.match(/\b(search|investigate|proof|evidence|inspect|look|read|trace|clue|find)\b/)
                ? "search"
                : "action";
    const objective = lower.match(/\b(bed|drawer|desk|writing case|case|bag|pocket|key|letter|note|ledger|knife|gun|candlestick|poison|document|proof|evidence|body|blood|secret|alibi|witness|room|wallet|cufflink|button|lighter|matchbook|watch|ring|locket|paper|medicine|vial|photo|photograph|badge|ticket|card|receipt)\b/)?.[1] ?? "general";
    const place = roomIntent?.id ?? roomId;
    const targetPart = target?.id ?? "no-target";
    return [`day-${mystery.day}`, check, action, place, targetPart, objective].join(":");
  }

  function mysteryRollAttemptIsLimited(mystery: MysteryGame, key: string): boolean {
    return (mystery.rollAttemptLedger?.[key] ?? 0) >= 2;
  }

  function mysteryRecordRollAttempt(ledger: Record<string, number>, key: string): Record<string, number> {
    return { ...ledger, [key]: (ledger[key] ?? 0) + 1 };
  }

  function mysteryFindableFailureKey(check: MysteryCheckKind, day: number): string {
    return `${check}:day-${day}`;
  }

  function mysteryFindableFailureCount(findable: MysteryFindable | undefined, check: MysteryCheckKind, day: number): number {
    return findable?.rollFailures?.[mysteryFindableFailureKey(check, day)] ?? 0;
  }

  function mysteryFindableCheckIsLimited(findable: MysteryFindable | undefined, check: MysteryCheckKind, day: number): boolean {
    return mysteryFindableFailureCount(findable, check, day) >= 2;
  }

  function mysteryRoll(_text: string, _mystery: MysteryGame): string | undefined {
    const rollResult = mysteryRollOutcome(_text, _mystery);
    return mysteryRollText(rollResult);
  }

  function pickByHash<T>(items: readonly T[], seed: string): T {
    return items[stableHash(seed) % items.length];
  }

  function mysterySubstanceLine(npc: MysteryNpc): string | null {
    if (npc.substanceState === "drunk") return `${fullName(npc)} is drunk; their voice runs warmer, louder, and less guarded than usual.`;
    if (npc.substanceState === "tipsy") return `${fullName(npc)} is tipsy enough for their manners to loosen.`;
    if (npc.substanceState === "high") return `${fullName(npc)} seems high; their attention drifts and their trust is temporarily unstable.`;
    if (mysteryDisplaySubstancePreference(npc).includes("cigarettes")) return `${fullName(npc)} smells faintly of cigarette smoke.`;
    return null;
  }

  function refreshMysteryNpcStates(mystery: MysteryGame, npcs: MysteryNpc[], nextTime: { day: number; daytime: Daytime }): MysteryNpc[] {
    return npcs.map((npc) => {
      if (!npc.alive || npc.age < 16) return npc;
      let substanceState = npc.substanceTurns > 1 ? npc.substanceState : "sober";
      let substanceTurns = Math.max(0, npc.substanceTurns - 1);
      let temporaryTrust = substanceTurns > 0 ? npc.temporaryTrust : 0;
      const substancePreference = mysteryDisplaySubstancePreference(npc);
      const seed = `${mystery.id}-${nextTime.day}-${nextTime.daytime}-${npc.id}-substance`;
      const rollValue = stableHash(seed) % 100;
      if (ravenwoodDrinkTimes.includes(nextTime.daytime) && substancePreference.includes("alcohol") && rollValue < 30) {
        substanceState = rollValue < 10 ? "drunk" : "tipsy";
        substanceTurns = substanceState === "drunk" ? 3 : 2;
        temporaryTrust = substanceState === "drunk" ? rand(-7, 8) : rand(-3, 5);
      } else if ((nextTime.daytime === "Afternoon" || nextTime.daytime === "Evening" || nextTime.daytime === "Night") && substancePreference.includes("weed") && rollValue >= 30 && rollValue < 48) {
        substanceState = "high";
        substanceTurns = 3;
        temporaryTrust = rand(-6, 9);
      }
      return { ...npc, substanceState, substanceTurns, temporaryTrust };
    });
  }

  function resolveMysteryAbandonedItemPickups(mystery: MysteryGame, npcs: MysteryNpc[], findables: MysteryFindable[], nextTime: { day: number; daytime: Daytime }): { findables: MysteryFindable[]; ledgerLines: string[] } {
    const ledgerLines: string[] = [];
    const timeMystery = { ...mystery, day: nextTime.day, daytime: nextTime.daytime };
    const updated = findables.map((findable) => {
      if (findable.kind !== "Snatchable" || findable.origin !== "Abandoned" || findable.holderNpcId || !findable.roomId || findable.collected) return findable;
      if (!mysteryFindableAvailability(findable, nextTime.day, nextTime.daytime)) return findable;
      const passers = npcs.filter((npc) => npc.alive && currentMysteryNpcRoomId(timeMystery, npc) === findable.roomId);
      const picker = passers.find((npc) => stableHash(`${mystery.id}-${nextTime.day}-${nextTime.daytime}-${findable.id}-${npc.id}-pickup`) % 100 < 58);
      if (!picker) return findable;
      ledgerLines.push(`${fullName(picker)} picked up abandoned item "${findable.name}" in ${mysteryRoomName(mystery, findable.roomId)} on Day ${nextTime.day} ${nextTime.daytime}.`);
      return {
        ...findable,
        holderNpcId: picker.id,
        description: `${findable.description} ${fullName(picker)} later picked it up in ${mysteryRoomName(mystery, findable.roomId)}.`,
        playerDescription: mysteryStripPlayerHiddenFindableMeta(`${mysteryFindablePlayerFacingDescriptionValue(findable)} ${fullName(picker)} later picked it up in ${mysteryRoomName(mystery, findable.roomId)}.`)
      };
    });
    return { findables: updated, ledgerLines };
  }

  function mysteryTrustLabel(npc: MysteryNpc): string {
    const trust = effectiveMysteryTrust(npc);
    if (trust >= 74) return "trusts you";
    if (trust >= 52) return "leans toward you";
    if (trust >= 32) return "is cautious";
    if (trust >= 16) return "is guarded";
    return "does not trust you";
  }

  function mysteryToneForText(text: string): "kind" | "rude" | "threat" | "flirt" | "accuse" | "neutral" {
    const lower = text.toLowerCase();
    if (lower.match(/\b(threat|threaten|blackmail|force|intimidate|scare|corner)\b/)) return "threat";
    if (lower.match(/\b(accuse|murderer|killer|liar|guilty)\b/)) return "accuse";
    if (lower.match(/\b(flirt|beautiful|handsome|dance|romantic|kiss|seduce|darling|dear)\b/)) return "flirt";
    if (lower.match(/\b(stupid|idiot|shut up|coward|pathetic|worthless|trash)\b/)) return "rude";
    if (lower.match(/\b(please|kindly|sorry|thank|comfort|gentle|calm|help|understand)\b/)) return "kind";
    return "neutral";
  }

  function mysteryIsPositiveSocialRoll(rollResult: MysteryRollOutcome | undefined): boolean {
    return Boolean(rollResult && ["Charisma", "Rizz", "Persuasion", "Deception"].includes(rollResult.check) && rollResult.tier !== "failed");
  }

  function mysteryIsSocialRoll(rollResult: MysteryRollOutcome | undefined): rollResult is MysteryRollOutcome {
    return Boolean(rollResult && ["Charisma", "Rizz", "Persuasion", "Deception"].includes(rollResult.check));
  }

  function mysteryPositiveSocialRollTrustDelta(rollResult: MysteryRollOutcome): number {
    const checkBonus = rollResult.check === "Persuasion" ? 2 : rollResult.check === "Deception" ? 1 : 0;
    if (rollResult.tier === "hard") return 14 + checkBonus;
    if (rollResult.tier === "medium") return 9 + checkBonus;
    return 4 + checkBonus;
  }

  function mysteryFailedSocialRollTrustDelta(rollResult: MysteryRollOutcome, tone: ReturnType<typeof mysteryToneForText>): number {
    const checkPenalty = rollResult.check === "Deception" ? 4 : rollResult.check === "Persuasion" ? 2 : 0;
    const tonePenalty = tone === "threat" || tone === "accuse" ? 4 : tone === "rude" ? 5 : tone === "flirt" ? 2 : 0;
    const botchPenalty = mysteryRollBotched(rollResult) ? 4 : 0;
    return -(5 + checkPenalty + tonePenalty + botchPenalty);
  }

  function mysteryNoRollTrustGesture(text: string, npc: MysteryNpc): boolean {
    const lower = text.toLowerCase();
    if (lower.match(/\b(threat|threaten|blackmail|force|intimidate|accuse|murderer|killer|liar|guilty|stupid|idiot|worthless|seduce|kiss)\b/)) return false;
    const appearanceCompliment = lower.match(/\b(compliment|praise|nice|kind|elegant|well dressed|good coat|good dress|fine suit|smart outfit|pretty hair|handsome)\b/);
    if (appearanceCompliment && npc.age < 18 && lower.match(/\b(handsome|beautiful|pretty)\b/)) return false;
    return Boolean(appearanceCompliment || lower.match(/\b(ask about yourself|tell me about yourself|how are you|are you okay|listen to you|hear you out)\b/));
  }

  function mysteryToneTrustDelta(text: string, rollResult: MysteryRollOutcome | undefined, npc: MysteryNpc, player?: Pick<MysteryGame["player"], "age">): number {
    const tone = mysteryToneForText(text);
    const romanceAllowed = player ? mysteryCanPlayerHaveRomanceWithNpc(player, npc) : npc.age >= 18;
    const tierDelta = rollResult?.tier === "hard" ? 5 : rollResult?.tier === "medium" ? 3 : rollResult?.tier === "easy" ? 1 : -2;
    const alteredModifier = npc.substanceState === "drunk" || npc.substanceState === "high" ? rand(-2, 3) : 0;
    if (!rollResult && mysteryNoRollTrustGesture(text, npc)) return 1 + (stableHash(`${npc.id}-${text}-trust-gesture`) % 3);
    if (mysteryIsSocialRoll(rollResult) && rollResult.tier === "failed") {
      return clamp(mysteryFailedSocialRollTrustDelta(rollResult, tone) + alteredModifier, -18, -5);
    }
    if (rollResult && mysteryIsPositiveSocialRoll(rollResult) && tone !== "threat" && tone !== "rude") {
      if (tone === "flirt" && !romanceAllowed) return -6;
      const toneBonus = tone === "kind" ? 2 : tone === "flirt" ? 1 : tone === "accuse" ? -4 : 0;
      return clamp(mysteryPositiveSocialRollTrustDelta(rollResult) + toneBonus + alteredModifier, 3, 18);
    }
    if (tone === "kind") return Math.max(1, tierDelta + alteredModifier);
    if (tone === "flirt") return romanceAllowed ? clamp(tierDelta + alteredModifier, -4, 8) : -6;
    if (tone === "threat") return rollResult?.tier === "hard" ? -2 : -12;
    if (tone === "accuse") return rollResult?.tier === "hard" ? -3 : -14;
    if (tone === "rude") return -7;
    return rollResult && rollResult.tier !== "failed" ? 1 + alteredModifier : alteredModifier;
  }

  function mysteryTrustShiftLine(npc: MysteryNpc, trustDelta: number): string {
    if (trustDelta >= 12) return ` ${fullName(npc)} looks at you with new trust.`;
    if (trustDelta >= 6) return ` ${fullName(npc)} softens toward you.`;
    if (trustDelta >= 2) return ` ${fullName(npc)} seems a little more open.`;
    if (trustDelta <= -12) return ` ${fullName(npc)} pulls sharply away from you.`;
    if (trustDelta <= -6) return ` ${fullName(npc)} grows colder.`;
    if (trustDelta <= -2) return ` ${fullName(npc)} seems less willing to trust you.`;
    return "";
  }

  function mysteryRomanceDeltaForTone(tone: ReturnType<typeof mysteryToneForText>, romanceAllowed: boolean, rollResult: MysteryRollOutcome | undefined, trust: number): number {
    if (tone !== "flirt" || !romanceAllowed) return 0;
    if (rollResult?.tier === "failed") return -2;
    if (rollResult?.tier === "hard") return 7;
    if (rollResult?.tier === "medium") return 4;
    if (rollResult?.tier === "easy") return 2;
    return trust >= 45 ? 2 : 1;
  }

  function mysteryRomanceShiftLine(npc: MysteryNpc, romanceDelta: number, romanceAllowed: boolean, tone: ReturnType<typeof mysteryToneForText>): string {
    if (tone !== "flirt") return "";
    if (!romanceAllowed) return ` ${fullName(npc)} does not welcome the romantic turn.`;
    if (romanceDelta >= 6) return ` Romance with ${fullName(npc)} rises sharply.`;
    if (romanceDelta >= 3) return ` Romance with ${fullName(npc)} warms.`;
    if (romanceDelta >= 1) return ` Romance with ${fullName(npc)} stirs.`;
    if (romanceDelta <= -2) return ` Romance with ${fullName(npc)} cools.`;
    return ` ${fullName(npc)} notices the flirtation, but keeps their distance.`;
  }

  function applyMysteryTrustDelta(npcs: MysteryNpc[], ids: string[], delta: number): MysteryNpc[] {
    const idSet = new Set(ids);
    return npcs.map((npc) => idSet.has(npc.id) ? { ...npc, trust: clamp(npc.trust + delta, 0, 100) } : npc);
  }

  function mysteryWordsAreCloseMatch(left: string, right: string): boolean {
    if (left === right) return true;
    if (Math.abs(left.length - right.length) > 1 || Math.min(left.length, right.length) < 4) return false;
    if (left.length === right.length) {
      let differences = 0;
      for (let index = 0; index < left.length; index += 1) {
        if (left[index] !== right[index]) differences += 1;
        if (differences > 1) return false;
      }
      return true;
    }
    const shorter = left.length < right.length ? left : right;
    const longer = left.length < right.length ? right : left;
    let skipped = 0;
    for (let shortIndex = 0, longIndex = 0; longIndex < longer.length; longIndex += 1) {
      if (shorter[shortIndex] === longer[longIndex]) {
        shortIndex += 1;
      } else {
        skipped += 1;
        if (skipped > 1) return false;
      }
    }
    return true;
  }

  function mysteryTextMentionsNpc(lowerText: string, npc: MysteryNpc): boolean {
    const first = npc.firstName.toLowerCase();
    const full = fullName(npc).toLowerCase();
    if (lowerText.includes(first) || lowerText.includes(full)) return true;
    const words = lowerText.match(/[a-z]+/g) ?? [];
    return words.some((word) => mysteryWordsAreCloseMatch(word, first));
  }

  function mysteryTargetNpc(text: string, mystery: MysteryGame, roomId: string): MysteryNpc | undefined {
    const lower = text.toLowerCase();
    const named = mystery.npcs.find((npc) => mysteryTextMentionsNpc(lower, npc));
    if (named) return currentMysteryNpcRoomId(mystery, named) === roomId ? named : undefined;
    const roomPeople = mysteryPeopleInRoom(mystery, roomId).filter((person) => person.id !== mystery.player.id) as MysteryNpc[];
    return roomPeople[0];
  }

  function mysteryNpcRelationshipContext(npc: MysteryNpc, mystery: MysteryGame): string | null {
    const relationship = mystery.npcRelationships.find((item) => {
      if (item.fromId !== npc.id && item.toId !== npc.id) return false;
      if (item.availableDay && item.availableDaytime && !mysteryTimeHasArrived(mystery.day, mystery.daytime, item.availableDay, item.availableDaytime)) return false;
      return true;
    });
    if (!relationship) return null;
    const otherId = relationship.fromId === npc.id ? relationship.toId : relationship.fromId;
    return `${relationship.kind.toLowerCase()} with ${mysteryNpcName(mystery, otherId)}`;
  }

  function mysteryCrimeContextForNpc(npc: MysteryNpc, mystery: MysteryGame): string {
    const killed = mystery.murders.find((murder) => murder.victimId === npc.id);
    if (killed?.discovered) return "the victim whose silence now weighs on the house";
    const killer = mystery.murders.find((murder) => murder.killerId === npc.id);
    if (killer) return "protecting a dangerous secret";
    const relation = mystery.murders.find((murder) => murder.victimId !== npc.id && murder.killerId !== npc.id && mystery.npcRelationships.some((item) => (item.fromId === npc.id && item.toId === murder.victimId) || (item.toId === npc.id && item.fromId === murder.victimId) || (item.fromId === npc.id && item.toId === murder.killerId) || (item.toId === npc.id && item.fromId === murder.killerId)));
    if (relation) return "connected to someone at the heart of the case";
    return "watching the scandal from the edge of the circle";
  }

  function mysteryCarriedItems(npc: MysteryNpc): string[] {
    const base = npc.role === "Staff" ? ravenwoodStaffBelongings : ravenwoodPrivateBelongings;
    const items = [
      npc.role === "Staff" ? `${npc.stationRoomId.replace(/-/g, " ")} service key` : `${npc.roomId.replace(/-/g, " ")} room key`,
      pickByHash(base, `${npc.id}-carried-a`),
      pickByHash(base, `${npc.id}-carried-b`),
      `${npc.occupation.toLowerCase()} note`
    ];
    return Array.from(new Set(items));
  }

  function mysteryTheftDifficulty(text: string, npc: MysteryNpc, roomPeople: MysteryNpc[], mystery: MysteryGame): { tier: MysteryRollOutcome["tier"]; item: string; reason: string; findableId?: string } {
    const lower = text.toLowerCase();
    const snatchables = (mystery.findables ?? []).filter((findable) =>
      findable.kind === "Snatchable" &&
      findable.holderNpcId === npc.id &&
      mysteryFindableAvailability(findable, mystery.day, mystery.daytime)
    );
    const carried = snatchables.length > 0 ? snatchables.map(mysteryFindablePlayerFacingNameValue) : mysteryCarriedItems(npc);
    const requested = carried.find((item) => lower.includes(item.toLowerCase())) ?? carried.find((item) => item.includes("key") && lower.includes("key")) ?? carried[0];
    const findable = snatchables.find((candidate) => candidate.name === requested || mysteryFindablePlayerFacingNameValue(candidate) === requested);
    const witnessCount = roomPeople.filter((person) => person.id !== npc.id).length;
    const targetAlert = npc.substanceState === "drunk" || npc.substanceState === "high" ? -1 : effectiveMysteryTrust(npc) < 18 ? 1 : 0;
    const roomPressure = mystery.daytime === "Night" || mystery.daytime === "Midnight" ? -1 : witnessCount >= 3 ? 1 : 0;
    const itemPressure = requested.includes("guests' secrets") || requested.includes("lock-picking tools")
      ? 2
      : requested.includes("key") || requested.includes("ledger") || requested.includes("letter")
        ? 1
        : 0;
    const difficultyScore = targetAlert + roomPressure + itemPressure;
    const tier = difficultyScore >= 2 ? "hard" : difficultyScore >= 1 ? "medium" : "easy";
    const reason = requested.includes("guests' secrets")
      ? "it is guarded like a roll 10 secret, and being caught would turn the house against you"
      : witnessCount > 0
      ? `${witnessCount} resident${witnessCount === 1 ? "" : "s"} could notice`
      : npc.substanceState === "drunk" || npc.substanceState === "high"
        ? `${fullName(npc)} is less steady than usual`
        : "the room gives you a narrow opening";
    return { tier, item: requested, reason, findableId: findable?.id };
  }

  function mysteryReactiveRoomLine(mystery: MysteryGame, roomId: string): string {
    const room = mystery.rooms.find((candidate) => candidate.id === roomId);
    const people = mysteryPeopleInRoom(mystery, roomId).filter((person) => person.id !== mystery.player.id) as MysteryNpc[];
    const nearby = people.length > 0
      ? `${people.map(fullName).join(", ")} ${people.length === 1 ? "is" : "are"} nearby.`
      : "No resident is openly present.";
    return `${room ? mysteryRoomMood(room, mystery) : "The room feels quiet and uncertain."} ${nearby}`;
  }

  function mysterySubstanceBehavior(npc: MysteryNpc): string | null {
    if (npc.substanceState === "drunk") return "Their voice is warmer, louder, and less guarded than usual.";
    if (npc.substanceState === "tipsy") return "Their manners have loosened a little.";
    if (npc.substanceState === "high") return "Their attention drifts between the room and the conversation.";
    if (mysteryDisplaySubstancePreference(npc).includes("cigarettes")) return "They smell faintly of cigarette smoke.";
    return null;
  }

  function mysteryFoodAnswer(text: string, mystery: MysteryGame, npc: MysteryNpc, trust: number): string | null {
    const lower = text.toLowerCase();
    if (!lower.match(/\b(food|meal|breakfast|lunch|dinner|tea|kitchen|cook|chef|eat|tasty|good here|served)\b/)) return null;
    const currentMeal = mystery.daytime === "Breakfast" || mystery.daytime === "Lunch" ? mystery.daytime.toLowerCase() : mystery.daytime === "Evening" ? "dinner" : "meals";
    const foodMurder = mystery.murders.find((murder) => murder.discovered && murder.method.toLowerCase().includes("food"));
    if (foodMurder && trust >= 45) {
      return `The food is usually excellent. That is why ${mysteryNpcName(mystery, foodMurder.victimId)} being poisoned through it feels so obscene. I would not touch anything left unattended.`;
    }
    if (npc.role === "Staff") {
      return trust >= 45
        ? `Yes. The kitchen is one of the few parts of Ravenwood that still runs beautifully. ${titleCase(currentMeal)} is usually rich, careful, and far better than the mood in the dining room.`
        : `Yes, the food is good. The kitchen takes pride in that, even when the guests make everything else difficult.`;
    }
    if (npc.substanceState === "drunk") {
      return `Too good, honestly. The sort of food that makes people linger over wine and say things they should have swallowed.`;
    }
    if (npc.substanceState === "high") {
      return `Yes. The puddings especially. Everything tastes a little unreal in this place, but the kitchen knows what it is doing.`;
    }
    if (trust >= 60) {
      return `It is very good. Breakfast is generous, lunch is polished, and dinner tries hard to pretend this house is normal.`;
    }
    if (trust >= 28) {
      return `Good, yes. A little old-fashioned, but good. Ravenwood may be strange, but it does not starve its guests.`;
    }
    return `Yes. Good enough.`;
  }

  function mysteryReferencedInventoryItem(text: string, mystery: MysteryGame): string | undefined {
    const lower = text.toLowerCase();
    return [...mystery.inventory]
      .sort((a, b) => b.length - a.length)
      .find((item) => lower.includes(item.toLowerCase()) || lower.includes(titleCase(item).toLowerCase()));
  }

  function mysteryInventoryItemLooksOwnedByNpc(item: string, npc: MysteryNpc): boolean {
    const lower = item.toLowerCase();
    return lower.includes(fullName(npc).toLowerCase()) ||
      lower.includes(npc.firstName.toLowerCase()) ||
      lower.includes(npc.familyName.toLowerCase()) ||
      lower.includes(mysteryNpcInitials(npc).toLowerCase());
  }

  function mysteryMeaningfulItemWords(item: string): string[] {
    const ignored = new Set(["with", "from", "room", "guest", "staff", "service", "marked", "engraved", "broken", "found", "near", "inside", "under", "listing", "page", "note"]);
    return Array.from(new Set(
      item
        .toLowerCase()
        .match(/[a-z]+/g)
        ?.filter((word) => word.length >= 4 && !ignored.has(word)) ?? []
    ));
  }

  function mysteryTransferInventoryItem(text: string, mystery: MysteryGame, target?: MysteryNpc): string | undefined {
    const lower = text.toLowerCase();
    const pronounForTarget = target && (
      (target.sex === "Female" && /\b(her|hers)\b/.test(lower)) ||
      (target.sex === "Male" && /\b(him|his)\b/.test(lower)) ||
      /\b(their|theirs)\b/.test(lower)
    );
    const scored = mystery.inventory
      .map((item) => {
        const itemLower = item.toLowerCase();
        const displayLower = displayMysteryItemName(item).toLowerCase();
        let score = 0;
        if (lower.includes(itemLower) || lower.includes(displayLower)) score += 12;
        for (const word of mysteryMeaningfulItemWords(item)) {
          if (lower.includes(word)) score += 2;
        }
        if (target && mysteryInventoryItemLooksOwnedByNpc(item, target)) score += pronounForTarget ? 8 : 5;
        return { item, score };
      })
      .filter((candidate) => candidate.score > 0)
      .sort((a, b) => b.score - a.score || b.item.length - a.item.length);
    return scored[0]?.item;
  }

  function mysteryItemTransferIntent(text: string): boolean {
    return /\b(give|hand|return|give back|hand back|bring back|offer|pass|deliver)\b/i.test(text);
  }

  function mysteryInventoryItemNpcReaction(item: string, npc: MysteryNpc): string | null {
    const lower = item.toLowerCase();
    const npcName = fullName(npc).toLowerCase();
    const npcInitials = mysteryNpcInitials(npc).toLowerCase();
    if (lower.includes(npcName) || lower.includes(npcInitials)) {
      return "That is mine, where did you find it?";
    }
    if ((lower.includes("cigarette") || lower.includes("lighter")) && mysteryDisplaySubstancePreference(npc).includes("cigarettes")) {
      return "A cigarette is a small mercy in this house. I might answer better with one in my hand.";
    }
    if ((lower.includes("vial") || lower.includes("aspirin") || lower.includes("prescription")) && /doctor|nurse|medical|first aid/i.test(npc.occupation)) {
      return "Let me see that. Medicine tells a story when people lie about everything else.";
    }
    if ((lower.includes("toy") || lower.includes("drawing")) && npc.age < 13) {
      return "I know that. Children notice where things are dropped when adults are busy pretending.";
    }
    if ((lower.includes("letter") || lower.includes("stationery") || lower.includes("envelope") || lower.includes("document")) && npc.trust >= 35) {
      return "Paper is never neutral here. Handwriting, folds, who had access: that is where I would start.";
    }
    if ((lower.includes("perfume") || lower.includes("locket") || lower.includes("ring")) && /dating|engaged|relationship|married/i.test(npc.familyStatus)) {
      return "Careful. Objects like that can ruin a life before they solve a murder.";
    }
    return null;
  }

  function mysteryNpcConversationMemoryWrites(text: string, mystery: MysteryGame, npc: MysteryNpc, trustDelta: number, romanceDelta: number, rollResult?: MysteryRollOutcome, referencedItem?: string | null): string[] {
    const tone = mysteryToneForText(text);
    const writes: string[] = [];
    if (tone === "kind") writes.push(`${mystery.player.firstName} spoke kindly`);
    if (tone === "threat") writes.push(`${mystery.player.firstName} threatened them`);
    if (tone === "rude" || tone === "accuse") writes.push(`${mystery.player.firstName} pressed them harshly`);
    if (tone === "flirt") writes.push(`${mystery.player.firstName} flirted with them`);
    if (referencedItem) writes.push(`${mystery.player.firstName} brought up ${displayMysteryItemName(referencedItem)}`);
    if (trustDelta >= 4) writes.push(`trust rose after a useful conversation`);
    if (trustDelta <= -4) writes.push(`trust fell after an uncomfortable conversation`);
    if (romanceDelta > 0) writes.push(`the conversation felt privately charged`);
    if (rollResult?.tier === "hard") writes.push(`${mystery.player.firstName} made a sharp impression`);
    return Array.from(new Set(writes)).slice(0, 3);
  }

  function mysteryResidentReply(text: string, mystery: MysteryGame, npc: MysteryNpc, rollResult?: MysteryRollOutcome): { message: StoryMessage; trustDelta: number; romanceDelta: number } {
    const trust = effectiveMysteryTrust(npc);
    const tone = mysteryToneForText(text);
    const relationship = mysteryNpcRelationshipContext(npc, mystery);
    const proofMention = mystery.discoveredProof.find((proof) => proof.toLowerCase().includes(npc.firstName.toLowerCase()) || proof.toLowerCase().includes(npc.familyName.toLowerCase()));
    const discoveredMurder = mystery.murders.find((murder) => murder.discovered);
    const directToCrime = /\b(murder|death|dead|body|killer|motive|alibi|where were|proof|evidence|victim)\b/i.test(text);
    const referencedItem = mysteryReferencedInventoryItem(text, mystery);
    const itemReaction = referencedItem ? mysteryInventoryItemNpcReaction(referencedItem, npc) : null;
    const romanceAllowed = mysteryCanPlayerHaveRomanceWithNpc(mystery.player, npc);
    const trustDelta = mysteryToneTrustDelta(text, rollResult, npc, mystery.player);
    const romanceDelta = mysteryRomanceDeltaForTone(tone, romanceAllowed, rollResult, trust);
    const substance = mysterySubstanceBehavior(npc);
    let answer = "";
    const foodAnswer = mysteryFoodAnswer(text, mystery, npc, trust);
    if (itemReaction) {
      answer = itemReaction;
    } else if (foodAnswer) {
      answer = foodAnswer;
    } else if (tone === "threat") {
      answer = trust > 55 && rollResult?.tier === "hard"
        ? "You are frighteningly direct. I will answer because I believe you mean to finish this."
        : "Do not mistake this hotel for an empty house. People hear things through these walls.";
    } else if (tone === "flirt") {
      answer = !romanceAllowed
        ? "That is not appropriate. Ask about the case if you must."
        : trust > 45 || rollResult?.tier === "hard"
          ? "You choose a dangerous hour to be charming. Still, I am listening."
          : "Charm is cheap at Ravenwood. Trust costs more.";
    } else if (tone === "kind") {
      answer = "That is the first decent tone I have heard in this house all day. Ask, then.";
    } else if (tone === "rude" || tone === "accuse") {
      answer = rollResult?.tier === "hard" && directToCrime
        ? "Insult me if you must, but I can see you have noticed something real."
        : "If you want honesty, try not to throw stones in a room full of glass.";
    } else if (directToCrime && proofMention) {
      answer = `You have already found ${proofMention}. I saw enough to know it was not left there by accident.`;
    } else if (directToCrime && trust >= 60) {
      answer = relationship
        ? `I will say this once: my ${relationship} matters here, and someone is using that fact as cover.`
        : "The night of it, the staff moved too quietly and the guests spoke too loudly. That is usually where guilt hides.";
    } else if (directToCrime && trust >= 32) {
      answer = discoveredMurder
        ? `${mysteryNpcName(mystery, discoveredMurder.victimId)} had enemies, but Ravenwood teaches enemies to smile at breakfast.`
        : "No one has died in public yet, and that is exactly what makes everyone so careful.";
    } else if (directToCrime) {
      answer = "I do not discuss death with strangers over polished wood and hotel tea.";
    } else if (relationship && trust >= 42) {
      answer = `Ravenwood makes every private tie feel like evidence. Mine is ${relationship}, and I hate that you can use that.`;
    } else {
      answer = trust > 24
        ? "I would rather avoid hotel gossip. Ask me something specific and I may risk a real answer."
        : "I am not here to perform for strangers. Say what you want, plainly.";
    }
    const behavior = substance ? `${substance} ` : "";
    const crimeContext = trust >= 50 || rollResult?.tier === "hard" ? ` ${fullName(npc)} seems ${mysteryCrimeContextForNpc(npc, mystery)}.` : "";
    const remembered = (mystery.npcConversationMemory?.[npc.id] ?? []).slice(-1)[0];
    const memoryEcho = remembered && trust >= 18 ? ` ${fullName(npc)} remembers that ${remembered}.` : "";
    const line = `${behavior}${fullName(npc)} ${mysteryTrustLabel(npc)}. "${answer}"${memoryEcho}${crimeContext}`;
    return {
      trustDelta,
      romanceDelta,
      message: {
        id: uid(),
        speaker: "GM",
        text: line,
        rich: [
          { text: behavior },
          { text: fullName(npc), npcId: npc.id, color: mysteryDialogueColor(npc, mystery) },
          { text: ` ${mysteryTrustLabel(npc)}. ` },
          { text: `"${answer}"`, color: mysteryDialogueColor(npc, mystery) },
          { text: memoryEcho },
          { text: crimeContext }
        ]
      }
    };
  }

  function stampMysteryMessages(
    messages: StoryMessage[],
    day: number,
    daytime: Daytime
  ): StoryMessage[] {
    return messages.map((message) => ({
      ...message,
      archiveDay: message.archiveDay ?? day,
      archiveDaytime: message.archiveDaytime ?? daytime
    }));
  }

  function appendMysteryJournal(journal: StoryMessage[], archived: StoryMessage[]): StoryMessage[] {
    const existingIds = new Set(journal.map((message) => message.id));
    return [...journal, ...archived.filter((message) => !existingIds.has(message.id))].slice(-120);
  }

  function splitMysteryMessages(messages: StoryMessage[]): { visible: StoryMessage[]; archived: StoryMessage[] } {
    return {
      visible: messages.slice(-5),
      archived: messages.slice(0, Math.max(0, messages.length - 5))
    };
  }

  function mysteryDialogueColor(npc: MysteryNpc, mystery?: MysteryGame): string {
    if (npc.role === "Staff") return "#b8b9bd";
    const guestColors = [
      "#f0c45c", "#7ed7d1", "#d99bff", "#8fb7ff", "#f195a7",
      "#9fd984", "#ffbf80", "#c7a7ff", "#81c7f5", "#e6d06f",
      "#f58fd6", "#90e0a8", "#e5a66f", "#b9d47a", "#9fd0ff",
      "#d8a1a7", "#ace2dd", "#e7c37d", "#bca8ff", "#f2a089"
    ];
    const guestIndex = mystery
      ? mystery.npcs.filter((candidate) => candidate.role === "Guest").findIndex((candidate) => candidate.id === npc.id)
      : -1;
    return guestColors[(guestIndex >= 0 ? guestIndex : stableHash(npc.id)) % guestColors.length];
  }

  function mysteryNpcSegments(text: string, mystery: MysteryGame): StoryMessageSegment[] {
    const names = mystery.npcs
      .map((npc) => ({ npc, name: fullName(npc) }))
      .sort((a, b) => b.name.length - a.name.length);
    const segments: StoryMessageSegment[] = [];
    let remaining = text;
    while (remaining.length > 0) {
      const hit = names
        .map(({ npc, name }) => {
          const index = remaining.toLowerCase().indexOf(name.toLowerCase());
          return index >= 0 ? { npc, name, index } : null;
        })
        .filter(Boolean)
        .sort((a, b) => (a?.index ?? 0) - (b?.index ?? 0))[0];
      if (!hit) {
        segments.push({ text: remaining });
        break;
      }
      if (hit.index > 0) segments.push({ text: remaining.slice(0, hit.index) });
      segments.push({ text: remaining.slice(hit.index, hit.index + hit.name.length), npcId: hit.npc.id, color: mysteryDialogueColor(hit.npc, mystery) });
      remaining = remaining.slice(hit.index + hit.name.length);
    }
    return segments;
  }

  type MysteryHotelMoodPhase = "daytime" | "night" | "afterMurder";

  function mysteryHotelMoodPhase(mystery?: Pick<MysteryGame, "daytime" | "murders">): MysteryHotelMoodPhase {
    if (mystery?.murders.some((murder) => murder.discovered || murder.solved)) return "afterMurder";
    if (mystery?.daytime === "Night" || mystery?.daytime === "Midnight") return "night";
    return "daytime";
  }

  function mysteryRoomMood(room: MysteryRoom, mystery?: Pick<MysteryGame, "daytime" | "murders">): string {
    const phase = mysteryHotelMoodPhase(mystery);
    const fallback: Record<MysteryHotelMoodPhase, string> = {
      daytime: "The room feels quiet and watchful.",
      night: "The room feels dim and uneasy.",
      afterMurder: "The room feels tense and suspicious."
    };
    const byKind: Partial<Record<MysteryRoom["kind"], Record<MysteryHotelMoodPhase, string>>> = {
      guest: {
        daytime: "The private room feels tidy and guarded.",
        night: "The private room feels hushed and airless.",
        afterMurder: "The private room feels exposed and tense."
      },
      staff: {
        daytime: "The staff room feels narrow and busy.",
        night: "The staff room feels tired and secretive.",
        afterMurder: "The staff room feels strained and alert."
      },
      service: {
        daytime: "The service room feels cramped and practical.",
        night: "The service room feels shadowed and stale.",
        afterMurder: "The service room feels watched and dangerous."
      },
      hidden: {
        daytime: "The hidden room feels stale and forbidden.",
        night: "The hidden room feels black and breathless.",
        afterMurder: "The hidden room feels guilty and cold."
      }
    };
    const moods: Record<string, Record<MysteryHotelMoodPhase, string>> = {
      "grand-hall": {
        daytime: "The Grand Hall feels polished and watchful.",
        night: "The Grand Hall feels hollow and moonlit.",
        afterMurder: "The Grand Hall feels brittle and guarded."
      },
      "drawing-room": {
        daytime: "The Drawing Room feels formal and smoky.",
        night: "The Drawing Room feels dim and brittle.",
        afterMurder: "The Drawing Room feels stiff and accusatory."
      },
      "dining-room": {
        daytime: "The Dining Room feels bright and ordered.",
        night: "The Dining Room feels cold and deserted.",
        afterMurder: "The Dining Room feels silent and spoiled."
      },
      library: {
        daytime: "The Library feels dusty and clever.",
        night: "The Library feels shadowed and watchful.",
        afterMurder: "The Library feels locked and suspicious."
      },
      conservatory: {
        daytime: "The Conservatory feels damp and green.",
        night: "The Conservatory feels glassy and haunted.",
        afterMurder: "The Conservatory feels overgrown and nervous."
      },
      "billiards-room": {
        daytime: "The Billiards Room feels polished and idle.",
        night: "The Billiards Room feels smoky and smug.",
        afterMurder: "The Billiards Room feels tense and abandoned."
      },
      "smoking-room": {
        daytime: "The Smoking Room feels stale and private.",
        night: "The Smoking Room feels heavy and secretive.",
        afterMurder: "The Smoking Room feels guilty and airless."
      },
      "west-gallery": {
        daytime: "The West Gallery feels grand and judging.",
        night: "The West Gallery feels long and ghostly.",
        afterMurder: "The West Gallery feels cold and watchful."
      }
    };
    return moods[room.id]?.[phase] ?? byKind[room.kind]?.[phase] ?? fallback[phase];
  }

  function mysteryRoomDescription(mystery: MysteryGame, roomId: string): StoryMessage {
    const room = mystery.rooms.find((candidate) => candidate.id === roomId);
    const people = mysteryPeopleInRoom(mystery, roomId).filter((person) => person.id !== mystery.player.id) as MysteryNpc[];
    const text = room
      ? `${mysteryRoomMood(room, mystery)} ${people.length > 0 ? `${people.map(fullName).join(", ")} ${people.length === 1 ? "is" : "are"} nearby.` : "No resident is openly present."}`
      : `You pause, unsure where Ravenwood has led you.`;
    return { id: uid(), speaker: "GM", text, rich: mysteryNpcSegments(text, mystery) };
  }

  function mysteryEavesdropSheetFact(npc: MysteryNpc, mystery: MysteryGame): string {
    const facts = [
      `Reason of stay: ${mysteryDisplayReasonOfStay(npc, mystery)}`,
      `Secret: ${mysteryResidentSecretLines(npc, mystery).join("; Secret: ")}`,
      `Current stay: ${npc.currentStay}`
    ].filter((fact) => !fact.endsWith(" "));
    return facts[stableHash(`${npc.id}-${mystery.day}-${mystery.daytime}-eavesdrop`) % facts.length] ?? `They are more involved in Ravenwood than they first appear`;
  }

  function detectMysteryRoomIntent(text: string, mystery: MysteryGame): MysteryRoom | undefined {
    const lower = text.toLowerCase();
    if (!lower.match(/\b(go|walk|move|head|enter|leave|return|visit|switch|travel)\b/)) return undefined;
    return [...mystery.rooms]
      .sort((a, b) => b.name.length - a.name.length)
      .find((room) => lower.includes(room.name.toLowerCase()) || lower.includes(room.id.replace(/-/g, " ")));
  }

  function mysterySpeechIntent(text: string): boolean {
    if (/\b(do you|did you|can you|could you|would you|will you|were you|are you|have you|tell me|know any|anything you|what do you|where were you|why did you|who did you)\b/i.test(text)) return true;
    return /\b(i|he|she|they|we)\s+(say|says|ask|asks|tell|tells|reply|replies|whisper|whispers|shout|shouts)\b/i.test(text)
      || /\b(compliment|praise|chat with|speak with|talk to|listen to|hear out)\b/i.test(text)
      || /["â€śâ€ť]/.test(text);
  }

  function mysteryAttitudeFor(npc: MysteryNpc, mystery: MysteryGame): string {
    const relationRisk = mystery.npcRelationships
      .filter((relationship) => relationship.fromId === npc.id || relationship.toId === npc.id)
      .reduce((total, relationship) => total + relationship.motiveRisk + relationship.trustImpact, 0);
    if (!npc.alive) return "can no longer answer";
    if (npc.trust >= 15) return "seems willing to help, though not without fear";
    if (relationRisk > 18) return "looks cornered by private obligations";
    if (npc.trust <= 6) return "keeps their expression carefully shut";
    return "answers with cautious politeness";
  }

  function mysteryDialogueMessage(text: string, mystery: MysteryGame, namedNpc?: MysteryNpc): StoryMessage {
    const roomPeople = mysteryPeopleInRoom(mystery, mystery.currentRoomId).filter((person) => person.id !== mystery.player.id) as MysteryNpc[];
    const npc = namedNpc ?? roomPeople[0];
    if (!npc) {
      const line = `Your words fall into the ${mysteryRoomName(mystery, mystery.currentRoomId)} without an answer; no resident is close enough to reply.`;
      return { id: uid(), speaker: "GM", text: line, rich: mysteryNpcSegments(line, mystery) };
    }
    const relationship = mystery.npcRelationships.find((item) => item.fromId === npc.id || item.toId === npc.id);
    const proofMention = mystery.discoveredProof.find((proof) => proof.toLowerCase().includes(npc.firstName.toLowerCase()) || proof.toLowerCase().includes(npc.familyName.toLowerCase()));
    const answer = proofMention
      ? `I know what that proof suggests. Ask me carefully, and I may remember who stood close enough to plant it.`
      : relationship && npc.trust > 10
        ? `I heard something connected to ${relationship.kind.toLowerCase()}, but I will not say it loudly here.`
        : npc.trust > 12
          ? `I can answer, but Ravenwood has taught me to choose every word twice.`
          : `That is a bold question for someone I barely know.`;
    const intro = `${fullName(npc)} ${mysteryAttitudeFor(npc, mystery)}. `;
    return {
      id: uid(),
      speaker: "GM",
      text: `${intro}"${answer}"`,
      rich: [
        { text: fullName(npc), npcId: npc.id, color: mysteryDialogueColor(npc, mystery) },
        { text: ` ${mysteryAttitudeFor(npc, mystery)}. ` },
        { text: `"${answer}"`, color: mysteryDialogueColor(npc, mystery) }
      ]
    };
  }

  function mysteryAiPacket(text: string, mystery: MysteryGame, rollResult?: MysteryRollOutcome) {
    const target = mysteryTargetNpc(text, mystery, mystery.currentRoomId);
    const nearby = mysteryPeopleInRoom(mystery, mystery.currentRoomId).filter((person) => person.id !== mystery.player.id) as MysteryNpc[];
    const targetRelationships = target
      ? mystery.npcRelationships
        .filter((relationship) => relationship.fromId === target.id || relationship.toId === target.id)
        .map((relationship) => {
          const otherId = relationship.fromId === target.id ? relationship.toId : relationship.fromId;
          return {
            kind: relationship.kind,
            detail: relationship.detail,
            hidden: relationship.hidden,
            otherResident: mysteryNpcName(mystery, otherId),
            trustImpact: relationship.trustImpact,
            motiveRisk: relationship.motiveRisk
          };
        })
      : [];
    return {
      playerAction: text,
      settingMood: {
        mood: ravenwoodHotelPremise.mood,
        daytime: ravenwoodHotelPremise.daytime,
        night: ravenwoodHotelPremise.night,
        isolation: ravenwoodHotelPremise.isolation
      },
      time: { day: mystery.day, daytime: mystery.daytime },
      room: {
        id: mystery.currentRoomId,
        name: mysteryRoomName(mystery, mystery.currentRoomId),
        mood: mysteryRoomMood(mystery.rooms.find((room) => room.id === mystery.currentRoomId) ?? { id: mystery.currentRoomId, name: mystery.currentRoomId, floor: 1, kind: "public", accessible: true, occupantIds: [] }, mystery)
      },
      detective: {
        name: fullName(mystery.player),
        age: mysteryPlayerAge(mystery.player),
        sex: mystery.player.sex,
        origin: mystery.player.origin,
        visibleStyle: [mystery.player.faceTrait, mystery.player.hairStyle, mystery.player.hairColor].filter(Boolean).join(", "),
        traits: []
      },
      roll: rollResult ?? null,
      targetResident: target ? {
        id: target.id,
        name: fullName(target),
        firstName: target.firstName,
        sex: target.sex,
        age: target.age,
        role: target.role,
        trustWithPlayer: effectiveMysteryTrust(target),
        baseTrust: target.trust,
        temporaryTrust: target.temporaryTrust,
        romance: mysteryCanPlayerHaveRomanceWithNpc(mystery.player, target) && target.romanceRevealed ? target.romance : "hidden",
        substanceState: target.substanceState,
        substancePreference: mysteryDisplaySubstancePreference(target),
        occupation: mysteryDisplayOccupation(target),
        education: mysteryDisplayEducation(target.education),
        reasonOfStay: mysteryDisplayReasonOfStay(target, mystery),
        secret: mysteryResidentSecretLines(target, mystery).join("; "),
        currentLocation: mysteryRoomName(mystery, currentMysteryNpcRoomId(mystery, target)),
        carriedItems: mysteryCarriedItems(target),
        relationships: targetRelationships
      } : null,
      nearbyResidents: nearby.slice(0, 8).map((npc) => ({
        id: npc.id,
        name: fullName(npc),
        role: npc.role,
        trustWithPlayer: effectiveMysteryTrust(npc),
        substanceState: npc.substanceState,
        currentLocation: mysteryRoomName(mystery, currentMysteryNpcRoomId(mystery, npc))
      })),
      knownCaseState: {
        discoveredProof: mystery.discoveredProof,
        inventory: mystery.inventory,
        pendingWitnessInvitations: (mystery.witnessInvitationNpcIds ?? [])
          .map((npcId) => {
            const witness = mystery.npcs.find((npc) => npc.id === npcId);
            if (!witness || mystery.witnessKnowledgeDeliveredNpcIds?.includes(witness.id)) return null;
            return {
              witness: fullName(witness),
              privateMeetingRoom: mysteryRoomName(mystery, mysteryPrivateMeetingRoomIdFor(witness)),
              knowledgeToRevealInPrivate: mysteryWitnessKnowledgeLinesFor(mystery, witness)
            };
          })
          .filter(Boolean),
        discoveredMurders: mystery.murders
          .filter((murder) => murder.discovered)
          .map((murder) => ({
            victim: mysteryNpcName(mystery, murder.victimId),
            room: mysteryRoomName(mystery, murder.roomId),
            method: murder.method,
            motive: murder.motive
          }))
      },
      hiddenTruthForConsistency: {
        murders: mystery.murders.map((murder) => ({
          victim: mysteryNpcName(mystery, murder.victimId),
          killer: mysteryNpcName(mystery, murder.killerId),
          room: mysteryRoomName(mystery, murder.roomId),
          method: murder.method,
          motive: murder.motive,
          proof: murder.proof,
          proofs: murder.proofs,
          discovered: murder.discovered
        }))
      },
      conversationMemory: (mystery.aiMemory ?? []).slice(-12),
      conversationSummaries: (mystery.aiConversationSummaries ?? []).slice(-6),
      recentConversation: mystery.messages.slice(-4).map((message) => ({ speaker: message.speaker, text: message.text }))
    };
  }

  function mysteryAiReplyFromValidated(reply: RavenwoodValidatedAiReply): MysteryAiReply {
    return {
      text: reply.text,
      trustDelta: reply.trustDelta,
      romanceDelta: reply.romanceDelta,
      revealRomance: reply.revealRomance,
      summary: reply.summary,
      memoryWrites: reply.memoryWrites,
      usedAi: reply.mode !== "scripted",
      mode: reply.mode
    };
  }

  async function requestMysteryAiReply(text: string, mystery: MysteryGame, rollResult?: MysteryRollOutcome): Promise<MysteryAiReply | null> {
    const packet = mysteryAiPacket(text, mystery, rollResult);
    const offlineStatus = await getRavenwoodModelStatus();
    if (offlineStatus.nativeCapable && offlineStatus.modelExists) {
      const offlineReply = await generateRavenwoodOfflineReply(packet);
      if (offlineReply) return mysteryAiReplyFromValidated(offlineReply);
    }
    if (typeof fetch !== "function") return null;
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeout = controller ? setTimeout(() => controller.abort(), 2500) : null;
    try {
      const response = await fetch(ravenwoodAiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(packet),
        signal: controller?.signal
      });
      if (!response.ok) return null;
      const data = await response.json();
      const validated = validateRavenwoodAiReply(data, "remote");
      return validated ? mysteryAiReplyFromValidated(validated) : null;
    } catch (_error) {
      return null;
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  async function refreshRavenwoodAiStatus() {
    setRavenwoodAiStatus(await getRavenwoodModelStatus());
  }

  async function downloadRavenwoodAiModel() {
    setMysteryAiThinking(true);
    setRavenwoodAiTestOutput("Downloading Ravenwood test model. Keep the app open.");
    const status = await downloadRavenwoodModel();
    setRavenwoodAiStatus(status);
    setRavenwoodAiTestOutput(status.error ? `Download status: ${status.error}` : `Model ready at ${status.modelPath ?? "device storage"}.`);
    setMysteryAiThinking(false);
  }

  async function loadRavenwoodAiModel() {
    setMysteryAiThinking(true);
    setRavenwoodAiTestOutput("Loading Ravenwood model into memory.");
    const status = await loadRavenwoodModel();
    setRavenwoodAiStatus(status);
    setRavenwoodAiTestOutput(status.loaded ? "Offline model loaded. Try a test line." : `Model not loaded: ${status.error ?? "download it first."}`);
    setMysteryAiThinking(false);
  }

  async function testRavenwoodAiModel() {
    const text = ravenwoodAiTestInput.trim();
    if (!text) return;
    setMysteryAiThinking(true);
    const packet = activeMystery
      ? mysteryAiPacket(text, activeMystery, mysteryRollOutcome(text, activeMystery))
      : {
        playerAction: text,
        time: { day: 1, daytime: "Evening" },
        room: { name: "Smoking Room", mood: "lamplight, smoke, closed doors" },
        targetResident: {
          name: "Nadine Woodmere",
          role: "Guest",
          trustWithPlayer: 28,
          substanceState: "sober",
          relationships: []
        },
        knownCaseState: { discoveredProof: [], inventory: ["notebook", "pencil"] },
        conversationMemory: [],
        hiddenTruthForConsistency: { murders: [] }
      };
    const reply = await generateRavenwoodOfflineReply(packet);
    setRavenwoodAiTestOutput(reply ? `${reply.text}\n\nJSON accepted. trust ${reply.trustDelta}, romance ${reply.romanceDelta}.` : "Offline AI unavailable or response failed validation. Use Download + Load in a development build, or the game will use scripted fallback.");
    setRavenwoodAiStatus(await getRavenwoodModelStatus());
    setMysteryAiThinking(false);
  }

  async function submitMysteryText(rawText?: string) {
    if (!activeMystery || activeMystery.finished) return;
    const text = (rawText ?? mysteryInput).trim().slice(0, 500);
    if (!text) return;
    const turnMystery = activeMystery;
    const turnRollResult = mysteryRollOutcome(text, turnMystery);
    setMysteryInput("");
    setMysteryAiThinking(true);
    const aiReply = await requestMysteryAiReply(text, turnMystery, turnRollResult);
    setMysteryAiThinking(false);
    patchMystery((mystery) => {
      const nextTime = nextMysteryTime(mystery.day, mystery.daytime);
      const lower = text.toLowerCase();
      const rollResult = turnRollResult;
      const rollText = mysteryRollText(rollResult);
      let movementRoom = detectMysteryRoomIntent(text, mystery);
      const closedDoorAction = /\b(lockpick|pick the lock|unlock|force the lock|sneak|slip in|eavesdrop|listen in|listen at|listen to|overhear|spy on|knock|rap|tap|use .*key|try .*key)\b/.test(lower);
      let closedDoorRoomId = mystery.closedDoorRoomId;
      let closedDoorReturnRoomId = mystery.closedDoorReturnRoomId;
      const pendingClosedDoorRoom = closedDoorRoomId
        ? mystery.rooms.find((room) => room.id === closedDoorRoomId)
        : undefined;
      if (!movementRoom && closedDoorAction && pendingClosedDoorRoom) movementRoom = pendingClosedDoorRoom;
      let currentRoom = mystery.currentRoomId;
      const messages: StoryMessage[] = [
        { id: uid(), speaker: "Player", text }
      ];
      let journal = [...mystery.journal];
      let aiMemory = [...(mystery.aiMemory ?? [])];
      let aiConversationSummaries = [...(mystery.aiConversationSummaries ?? [])];
      let npcConversationMemory = { ...(mystery.npcConversationMemory ?? {}) };
      let conversationNpcId = mystery.conversationRoomId === currentRoom ? mystery.conversationNpcId : undefined;
      let conversationRoomId = mystery.conversationRoomId === currentRoom ? mystery.conversationRoomId : undefined;
      let rooms = mystery.rooms;
      let npcs = refreshMysteryNpcStates(mystery, mystery.npcs, nextTime);
      let murders = mystery.murders;
      let inventory = [...mystery.inventory];
      let findables = [...(mystery.findables ?? [])];
      let medalEvents = [...(mystery.medalEvents ?? [])];
      let rollAttemptLedger = { ...(mystery.rollAttemptLedger ?? {}) };
      let seriousCatchCount = mystery.seriousCatchCount ?? 0;
      const namedSuspect = npcs.find((npc) => mysteryTextMentionsNpc(lower, npc));
      const suspectMurders = namedSuspect ? murders.filter((murder) => murder.killerId === namedSuspect.id) : [];
      const suspectProofs = suspectMurders.flatMap((murder) => murder.proofs?.length ? murder.proofs : [murder.proof]);
      let discoveredProof = [...mystery.discoveredProof];
      let finished = false;
      let won = false;
      let summary = mystery.summary;
      let lossPending = mystery.lossPending;
      let hiddenInRoomId = mystery.hiddenInRoomId;
      let hiddenFromNpcIds = [...(mystery.hiddenFromNpcIds ?? [])];
      let witnessInvitationNpcIds = [...(mystery.witnessInvitationNpcIds ?? [])];
      let witnessKnowledgeDeliveredNpcIds = [...(mystery.witnessKnowledgeDeliveredNpcIds ?? [])];
      let pendingBodyDiscoveryPopup = mystery.pendingBodyDiscoveryPopup;
      const workingMystery = () => ({ ...mystery, rooms, currentRoomId: currentRoom, npcs, murders, findables, discoveredProof, witnessInvitationNpcIds, witnessKnowledgeDeliveredNpcIds, npcConversationMemory, conversationNpcId, conversationRoomId });
      const ledgerLines = [
        `Turn: Day ${mystery.day} ${mystery.daytime}, ${mysteryRoomName(mystery, mystery.currentRoomId)}. Player wrote: "${text}". Next clock: Day ${nextTime.day} ${nextTime.daytime}.`
      ];
      const recordSeriousCatch = (reason: string): boolean => {
        seriousCatchCount += 1;
        ledgerLines.push(`Serious catch ${seriousCatchCount}/5: ${reason}.`);
        if (seriousCatchCount < 5) return false;
        finished = true;
        won = false;
        lossPending = true;
        summary = `${mystery.player.firstName} was locked in a closet by Ravenwood staff after being caught too many times.`;
        messages.push({ id: uid(), speaker: "GM", text: "Staff have had enough. They lock you in a service closet until the police arrive. The investigation is over." });
        ledgerLines.push("Loss triggered: fifth serious catch.");
        return true;
      };
      const rollAttemptKey = rollResult
        ? mysteryRollAttemptKey(text, mystery, rollResult.check, movementRoom?.id ?? currentRoom)
        : undefined;
      if (rollAttemptKey && mysteryRollAttemptIsLimited(mystery, rollAttemptKey)) {
        const line = `You tried and failed this exact approach twice today. Try a different method, a different target, or come back tomorrow when Ravenwood has shifted.`;
        const stampedMessages = stampMysteryMessages(
          [...mystery.messages, ...messages, { id: uid(), speaker: "GM", text: line }],
          mystery.day,
          mystery.daytime
        );
        const splitMessages = splitMysteryMessages(stampedMessages);
        return {
          ...mystery,
          messages: splitMessages.visible,
          storyFocusMessageId: splitMessages.visible.find((message) => message.text === line)?.id,
          journal: appendMysteryJournal(mystery.journal, splitMessages.archived),
          closedDoorRoomId,
          closedDoorReturnRoomId,
          sanityLedger: [...(mystery.sanityLedger ?? []), `Roll locked out: ${rollAttemptKey}. No time advanced.`].slice(-600)
        };
      }
      if (rollAttemptKey) rollAttemptLedger = mysteryRecordRollAttempt(rollAttemptLedger, rollAttemptKey);
      const abandonedPickups = resolveMysteryAbandonedItemPickups(mystery, npcs, findables, nextTime);
      findables = abandonedPickups.findables;
      ledgerLines.push(...abandonedPickups.ledgerLines);
      if (movementRoom && movementRoom.id !== mystery.currentRoomId) {
        const listeningAtClosedDoor = /\b(eavesdrop|listen in|listen at|listen to|overhear|spy on)\b/.test(lower) && !mysteryPlayerCanAccessRoom({ ...mystery, rooms, npcs }, movementRoom);
        if (listeningAtClosedDoor) {
          closedDoorRoomId = movementRoom.id;
          closedDoorReturnRoomId = currentRoom;
          const listenRoll = rollResult?.check === "Stealth" || rollResult?.check === "Search" ? rollResult : mysterySpecificRollOutcome("Stealth", workingMystery());
          const listenRollText = mysteryRollText(listenRoll);
          const inside = npcs.filter((npc) => npc.alive && currentMysteryNpcRoomId(workingMystery(), npc) === movementRoom.id);
          if (mysteryRollMeets(listenRoll, "medium")) {
            const names = inside.slice(0, 2).map(fullName).join(", ");
            const line = inside.length > 0
              ? `You listen at the closed door to ${movementRoom.name}. Inside, ${names} keep their voices low; you catch the shape of a private conversation.`
              : `You listen at the closed door to ${movementRoom.name}, but hear only old floorboards and distant house noise.`;
            messages.push({ id: uid(), speaker: "GM", text: line, roll: listenRollText, rich: mysteryNpcSegments(line, workingMystery()) });
            ledgerLines.push(`Closed-door eavesdropping succeeded at ${movementRoom.name}.${listenRollText ? ` ${listenRollText}.` : ""}`);
          } else {
            const affectedIds = inside.length > 0 ? inside.map((person) => person.id) : npcs.filter((npc) => npc.role === "Staff").map((npc) => npc.id);
            npcs = applyMysteryTrustDelta(npcs, affectedIds, -7);
            const line = inside.length > 0
              ? inside.length === 1
                ? `${fullName(inside[0])} notices someone lingering outside ${movementRoom.name}.`
                : `${inside.slice(0, 2).map(fullName).join(", ")} notice someone lingering outside ${movementRoom.name}.`
              : `A staff member catches you listening at the closed door to ${movementRoom.name}.`;
            messages.push({ id: uid(), speaker: "GM", text: line, roll: listenRollText, rich: mysteryNpcSegments(line, workingMystery()) });
            recordSeriousCatch(`caught sneaking to listen outside ${movementRoom.name}`);
            ledgerLines.push(`Closed-door eavesdropping failed at ${movementRoom.name}; trust -7 for immediate witnesses or staff.${listenRollText ? ` ${listenRollText}.` : ""}`);
          }
        } else {
          const access = mysteryResolveRoomAccessAttempt(text, { ...mystery, rooms, npcs }, movementRoom, rollResult);
          rooms = rooms.map((room) => room.id === movementRoom.id ? access.room : room);
          if (access.allowed) {
            closedDoorRoomId = undefined;
            closedDoorReturnRoomId = undefined;
            currentRoom = movementRoom.id;
            conversationNpcId = undefined;
            conversationRoomId = undefined;
            hiddenInRoomId = undefined;
            hiddenFromNpcIds = [];
            if (access.message) messages.push(access.message);
            messages.push(mysteryRoomDescription(workingMystery(), currentRoom));
            ledgerLines.push(`Typed movement: ${mystery.player.firstName} moved from ${mysteryRoomName(mystery, mystery.currentRoomId)} to ${movementRoom.name}. ${access.ledger}`);
          } else {
            closedDoorRoomId = movementRoom.id;
            closedDoorReturnRoomId = currentRoom;
            if (access.message) messages.push(access.message);
            const usedToolsAtDoor = lower.match(/\b(lockpick|pick the lock|unlock|force the lock)\b/) && mysteryPlayerHasLockpickingTools({ ...mystery, inventory });
            const riskySneakAtDoor = lower.match(/\b(sneak|slip in|follow|tail)\b/);
            if ((movementRoom.kind === "guest" || movementRoom.kind === "staff" || movementRoom.kind === "service") && (usedToolsAtDoor || riskySneakAtDoor)) {
              const roomOwnerIds = new Set(npcs.filter((npc) => npc.roomId === movementRoom.id || npc.stationRoomId === movementRoom.id).map((npc) => npc.id));
              npcs = npcs.map((npc) => {
                if (roomOwnerIds.has(npc.id)) return { ...npc, trust: clamp(npc.trust - 12, 0, 100) };
                if (npc.role === "Staff") return { ...npc, trust: clamp(npc.trust - 8, 0, 100) };
                return npc;
              });
              recordSeriousCatch(`caught trying to break into or sneak near ${movementRoom.name}`);
              ledgerLines.push(`Failed private access affected only ${movementRoom.name} occupants and staff: occupants -12, staff -8.`);
            }
            ledgerLines.push(access.ledger);
          }
        }
      }

      let bodyDiscoveryHappened = false;
      const dueTimeReached = (murder: MysteryMurder) => murder.day < nextTime.day || (murder.day === nextTime.day && daytimes.indexOf(murder.daytime) <= daytimes.indexOf(nextTime.daytime));
      const murderTimeReachedThisTurn = (murder: MysteryMurder) =>
        !mysteryTimeHasArrived(mystery.day, mystery.daytime, murder.day, murder.daytime) &&
        dueTimeReached(murder);
      const roomFallbacks = new Map<number, { fromId: string; toId: string; fromName: string; toName: string }>();
      murders = murders.map((murder, index) => {
        if (murder.discovered || murder.solved || murder.prevented || !murder.alternateRoomId || !murderTimeReachedThisTurn(murder) || murder.roomId !== currentRoom) return murder;
        const fromName = mysteryRoomName(mystery, murder.roomId);
        const toName = mysteryRoomName(mystery, murder.alternateRoomId);
        roomFallbacks.set(index, { fromId: murder.roomId, toId: murder.alternateRoomId, fromName, toName });
        return { ...murder, roomId: murder.alternateRoomId };
      });
      if (roomFallbacks.size > 0) {
        findables = findables.map((findable) => {
          if (findable.relatedMurderIndex === undefined) return findable;
          const fallback = roomFallbacks.get(findable.relatedMurderIndex);
          if (!fallback || findable.roomId !== fallback.fromId) return findable;
          return {
            ...findable,
            roomId: fallback.toId,
            description: findable.description.replaceAll(fallback.fromName, fallback.toName),
            playerDescription: findable.playerDescription?.replaceAll(fallback.fromName, fallback.toName),
            proofText: findable.proofText?.replaceAll(fallback.fromName, fallback.toName)
          };
        });
        roomFallbacks.forEach((fallback, index) => {
          ledgerLines.push(`Murder ${index + 1} room fallback: moved from ${fallback.fromName} to ${fallback.toName} because the player occupied ${fallback.fromName}.`);
        });
      }
      const dueMurders = murders.filter((murder) => !murder.discovered && !murder.solved && !murder.prevented && (murder.day < nextTime.day || (murder.day === nextTime.day && daytimes.indexOf(murder.daytime) <= daytimes.indexOf(nextTime.daytime))));
      if (dueMurders.length > 0) {
        const dueVictimIds = new Set(dueMurders.map((murder) => murder.victimId));
        npcs = npcs.map((npc) => dueVictimIds.has(npc.id) ? { ...npc, alive: false } : npc);
        const bodyDiscovery = dueMurders
          .map((murder) => {
            if (murder.roomId === currentRoom) return { murder, discovererName: mystery.player.firstName };
            const timeMystery = { ...workingMystery(), day: nextTime.day, daytime: nextTime.daytime, npcs };
            const npcDiscoverer = npcs.find((npc) =>
              npc.alive &&
              npc.id !== murder.killerId &&
              npc.id !== murder.victimId &&
              currentMysteryNpcRoomId(timeMystery, npc) === murder.roomId
            );
            return npcDiscoverer ? { murder, discovererName: fullName(npcDiscoverer) } : null;
          })
          .find(Boolean);
        if (bodyDiscovery) {
          const { murder: discoveredMurder, discovererName } = bodyDiscovery;
          bodyDiscoveryHappened = true;
          murders = murders.map((candidate) => candidate === discoveredMurder ? { ...candidate, discovered: true } : candidate);
          const foundByPlayer = discoveredMurder.roomId === currentRoom;
          const bodyDiscoveryText = foundByPlayer
            ? `You find ${mysteryNpcName(mystery, discoveredMurder.victimId)} dead in the ${mysteryRoomName(mystery, discoveredMurder.roomId)}. The cause of death appears to be ${discoveredMurder.method}.`
            : `${discovererName} finds ${mysteryNpcName(mystery, discoveredMurder.victimId)} dead in the ${mysteryRoomName(mystery, discoveredMurder.roomId)}. The cause of death appears to be ${discoveredMurder.method}.`;
          messages.push({
            id: uid(),
            speaker: "GM",
            icon: "death",
            text: `Dead body found! ${bodyDiscoveryText}`
          });
          pendingBodyDiscoveryPopup = {
            title: "Dead Body Found!",
            text: bodyDiscoveryText
          };
          ledgerLines.push(`Murder discovered by room entry: victim ${mysteryNpcName(mystery, discoveredMurder.victimId)}; killer ${mysteryNpcName(mystery, discoveredMurder.killerId)}; discoverer ${discovererName}; room ${mysteryRoomName(mystery, discoveredMurder.roomId)}; method ${discoveredMurder.method}. Victim marked dead.`);
        } else {
          ledgerLines.push(`Undiscovered murder time passed: ${dueMurders.map((murder) => mysteryNpcName(mystery, murder.victimId)).join(", ")} marked dead offscreen until the murder room is entered.`);
        }
      }

      if (finished) {
        ledgerLines.push("Action stopped because the mystery is already over.");
      } else if (bodyDiscoveryHappened) {
        ledgerLines.push("Action paused for the body discovery pop-up.");
      } else if (mysteryItemTransferIntent(text)) {
        const roomPeople = mysteryPeopleInRoom(workingMystery(), currentRoom).filter((person) => person.id !== mystery.player.id) as MysteryNpc[];
        const target = mysteryTargetNpc(text, workingMystery(), currentRoom);
        const targetPresent = target && roomPeople.some((person) => person.id === target.id);
        if (!target || !targetPresent) {
          const line = `You try to pass something over, but no clear recipient is close enough in the ${mysteryRoomName(mystery, currentRoom)}.`;
          messages.push({ id: uid(), speaker: "GM", text: line, roll: rollText, rich: mysteryNpcSegments(line, workingMystery()) });
          ledgerLines.push(`Item transfer failed: no reachable target in ${mysteryRoomName(mystery, currentRoom)}.${rollText ? ` ${rollText}.` : ""}`);
        } else {
          const transferItem = mysteryTransferInventoryItem(text, workingMystery(), target);
          if (!transferItem) {
            const line = `${fullName(target)} watches your hands, but you are not carrying an item that matches the request.`;
            messages.push({ id: uid(), speaker: "GM", text: line, roll: rollText, rich: mysteryNpcSegments(line, workingMystery()) });
            ledgerLines.push(`Item transfer failed: no matching inventory item for ${fullName(target)}.${rollText ? ` ${rollText}.` : ""}`);
          } else {
            const returningOwnItem = mysteryInventoryItemLooksOwnedByNpc(transferItem, target);
            const trustDelta = returningOwnItem ? 8 : 3;
            const itemLabel = displayMysteryItemName(transferItem);
            const reaction = mysteryInventoryItemNpcReaction(transferItem, target);
            inventory = mysteryRemoveOneInventoryItem(inventory, transferItem);
            conversationNpcId = target.id;
            conversationRoomId = currentRoom;
            npcs = npcs.map((npc) => npc.id === target.id ? { ...npc, trust: clamp(npc.trust + trustDelta, 0, 100) } : npc);
            const existingNpcMemory = npcConversationMemory[target.id] ?? [];
            npcConversationMemory = {
              ...npcConversationMemory,
              [target.id]: [...existingNpcMemory, `${mystery.player.firstName} gave them ${itemLabel}`].slice(-8)
            };
            const targetName = fullName(target);
            const targetColor = mysteryDialogueColor(target, workingMystery());
            const quoteText = reaction
              ? returningOwnItem
                ? `"You found this?" ${reaction}"`
                : `"${reaction}"`
              : returningOwnItem
                ? `"You found this?"`
                : "";
            const line = returningOwnItem
              ? `${targetName} takes back ${itemLabel}. ${quoteText} ${targetName} trusts you more for returning it.`
              : `${targetName} accepts ${itemLabel}.${quoteText ? ` ${quoteText}` : ""} ${targetName} seems a little more open.`;
            const rich: StoryMessageSegment[] = returningOwnItem
              ? [
                { text: targetName, npcId: target.id, color: targetColor },
                { text: ` takes back ${itemLabel}. ` },
                { text: quoteText, color: targetColor },
                { text: " " },
                { text: targetName, npcId: target.id, color: targetColor },
                { text: " trusts you more for returning it." }
              ]
              : [
                { text: targetName, npcId: target.id, color: targetColor },
                { text: ` accepts ${itemLabel}.` },
                ...(quoteText ? [{ text: ` ${quoteText}`, color: targetColor }] : []),
                { text: " " },
                { text: targetName, npcId: target.id, color: targetColor },
                { text: " seems a little more open." }
              ];
            messages.push({ id: uid(), speaker: "GM", text: line, roll: rollText, rich });
            ledgerLines.push(`Item transferred to ${fullName(target)}: ${transferItem}; removed from inventory; trust +${trustDelta}.${rollText ? ` ${rollText}.` : ""}`);
          }
        }
      } else if (lower.match(/\b(steal|snatch|pickpocket|lift|palm|take .*from|slip .*pocket|borrow .*without)\b/)) {
        const roomPeople = mysteryPeopleInRoom(workingMystery(), currentRoom).filter((person) => person.id !== mystery.player.id) as MysteryNpc[];
        const target = mysteryTargetNpc(text, workingMystery(), currentRoom);
        if (!target || !roomPeople.some((person) => person.id === target.id)) {
          const line = `You prepare the move, but no clear target is close enough in the ${mysteryRoomName(mystery, currentRoom)}.`;
          messages.push({ id: uid(), speaker: "GM", text: line, roll: rollText, rich: mysteryNpcSegments(line, workingMystery()) });
          ledgerLines.push(`Theft attempt had no reachable target in ${mysteryRoomName(mystery, currentRoom)}.${rollText ? ` ${rollText}.` : ""}`);
        } else {
          const difficulty = mysteryTheftDifficulty(text, target, roomPeople, workingMystery());
          if (mysteryRollBotched(rollResult)) {
            const witnesses = roomPeople.map((person) => person.id);
            npcs = applyMysteryTrustDelta(npcs, witnesses, -12);
            const witnessNames = roomPeople.slice(0, 3).map(fullName).join(", ");
            messages.push({ id: uid(), speaker: "GM", text: `Caught. Your hand is seen near ${fullName(target)}'s belongings. Trust drops with everyone present${witnessNames ? `: ${witnessNames}` : ""}.`, roll: rollText });
            recordSeriousCatch(`caught stealing from ${fullName(target)}`);
            ledgerLines.push(`Botched theft: target ${fullName(target)}; trust -12 for present residents.${rollText ? ` ${rollText}.` : ""}`);
          } else if (mysteryRollMeets(rollResult, difficulty.tier)) {
            const item = `${difficulty.item} (${fullName(target)})`;
            inventory = inventory.includes(item) ? inventory : [...inventory, item];
            if (difficulty.findableId) {
              findables = findables.map((findable) => findable.id === difficulty.findableId ? { ...findable, collected: true } : findable);
            }
            npcs = applyMysteryTrustDelta(npcs, [target.id], target.substanceState === "drunk" || target.substanceState === "high" ? -1 : -4);
            medalEvents = addMysteryMedalEvents(medalEvents, ["lightFingers"]);
            messages.push({ id: uid(), speaker: "GM", text: `Your attempt to steal succeeds. You take ${difficulty.item} from ${fullName(target)} without an open scene.`, roll: rollText });
            ledgerLines.push(`Successful theft: ${item}; difficulty ${difficulty.tier}; target trust adjusted.${rollText ? ` ${rollText}.` : ""}`);
          } else {
            const noticed = rollResult ? rollResult.total <= 2 : true;
            if (noticed) npcs = applyMysteryTrustDelta(npcs, [target.id], -6);
            const failLine = noticed
              ? `The theft does not land. ${fullName(target)} notices enough to pull away.`
              : "You withdraw before anyone can prove what you meant.";
            messages.push({ id: uid(), speaker: "GM", text: failLine, roll: rollText });
            if (noticed) recordSeriousCatch(`caught trying to steal from ${fullName(target)}`);
            ledgerLines.push(`Failed theft: target ${fullName(target)}; difficulty ${difficulty.tier}; noticed ${noticed}.${rollText ? ` ${rollText}.` : ""}`);
          }
        }
      } else if (lower.includes("search") || lower.includes("investigate") || lower.includes("proof") || lower.includes("evidence") || lower.includes("cards") || lower.includes("deck") || lower.match(/\b(pick up|take|grab)\b/)) {
        const roomFindables = findables.filter((findable) =>
          (findable.kind === "Proof" || (findable.kind === "Snatchable" && !findable.holderNpcId)) &&
          findable.roomId === currentRoom &&
          mysteryFindableAvailability(findable, mystery.day, mystery.daytime) &&
          (findable.kind !== "Proof" || !discoveredProof.includes(findable.proofText ?? findable.description))
        );
        const foundFindable = roomFindables.find((findable) => lower.includes(findable.name.toLowerCase()) || lower.includes(mysteryPlayerFacingFindableName(findable).toLowerCase())) ??
          roomFindables.find((findable) => mysteryInventoryIconFor(findable.name) && lower.includes(mysteryInventoryIconFor(findable.name)!)) ??
          roomFindables[0];
        const matchingMurder = foundFindable?.relatedMurderIndex !== undefined ? murders[foundFindable.relatedMurderIndex] : undefined;
        const foundProof = foundFindable?.proofText ?? foundFindable?.description;
        const roomPeople = mysteryPeopleInRoom(workingMystery(), currentRoom).filter((person) => person.id !== mystery.player.id) as MysteryNpc[];
        const baseSearchDifficulty: MysteryRollOutcome["tier"] = foundFindable?.searchDifficulty ?? (matchingMurder?.method.toLowerCase().includes("poison") || roomPeople.length > 2 ? "medium" : mystery.daytime === "Night" || mystery.daytime === "Midnight" ? "hard" : "easy");
        const searchCheck = rollResult?.check ?? "Search";
        const searchFailureCount = mysteryFindableFailureCount(foundFindable, searchCheck, mystery.day);
        const searchDifficulty = searchFailureCount > 0 ? mysteryIncreaseDifficulty(baseSearchDifficulty) : baseSearchDifficulty;
        const murderInSearchedRoom = murders.find((murder) => murder.roomId === currentRoom && (murder.discovered || dueTimeReached(murder)));
        const baseComposureDifficulty = murderInSearchedRoom ? mysteryMurderRoomComposureDifficulty(workingMystery(), murderInSearchedRoom) : undefined;
        const composureFailureCount = mysteryFindableFailureCount(foundFindable, "Composure", mystery.day);
        const composureDifficulty = baseComposureDifficulty ? (composureFailureCount > 0 ? mysteryIncreaseDifficulty(baseComposureDifficulty) : baseComposureDifficulty) : undefined;
        const searchLocked = mysteryFindableCheckIsLimited(foundFindable, searchCheck, mystery.day);
        const composureLocked = Boolean(composureDifficulty && mysteryFindableCheckIsLimited(foundFindable, "Composure", mystery.day));
        const composureRoll = foundFindable && foundProof && composureDifficulty && !searchLocked && !composureLocked ? mysterySpecificRollOutcome("Composure", workingMystery()) : undefined;
        const composureRollText = mysteryRollText(composureRoll);
        const combinedRollText = [rollText, composureRollText].filter(Boolean).join(" | ") || undefined;
        const searchPassed = mysteryRollMeets(rollResult, searchDifficulty);
        const composurePassed = !composureDifficulty || mysteryRollMeets(composureRoll, composureDifficulty);
        if (foundFindable && foundProof && (searchLocked || composureLocked)) {
          const line = `You already tried this twice today, and failed. Try a different kind of action, or come back tomorrow when the room may have changed.`;
          messages.push({ id: uid(), speaker: "GM", text: line, roll: combinedRollText });
          const lockedNames = [searchLocked ? searchCheck : null, composureLocked ? "Composure" : null].filter(Boolean).join(" and ");
          ledgerLines.push(`Search locked out for ${foundFindable.name} using ${lockedNames}. Other checks remain possible.`);
        } else if (foundFindable && foundProof && searchPassed && composurePassed) {
          if (foundFindable.kind === "Proof") discoveredProof.push(foundProof);
          const discoveryName = mysteryPlayerFacingFindableName(foundFindable);
          inventory = inventory.includes(foundFindable.name) || inventory.includes(discoveryName) ? inventory : [...inventory, discoveryName];
          findables = findables.map((findable) => findable.id === foundFindable.id ? { ...findable, collected: true } : findable);
          const composureNote = composureDifficulty ? " You keep steady despite the murder-room pressure." : "";
          const findLabel = "You find an item";
          const discoveryDescription = mysteryFindableDiscoveryDescriptionForMessage(foundFindable);
          const descriptionText = discoveryDescription ? ` ${discoveryDescription}` : "";
          messages.push({ id: uid(), speaker: "GM", text: `${findLabel}: ${discoveryName}.${descriptionText}${composureNote}`, roll: foundFindable.kind === "Proof" ? undefined : combinedRollText });
          ledgerLines.push(`${foundFindable.kind} discovered in ${mysteryRoomName(mystery, currentRoom)}: ${foundProof}. Difficulty ${searchDifficulty}; check ${searchCheck}${composureDifficulty ? `; composure difficulty ${composureDifficulty}` : ""}.`);
        } else {
          if (foundFindable && foundProof) {
            const failedChecks = Array.from(new Set([
              !searchPassed ? searchCheck : null,
              composureDifficulty && !composurePassed ? "Composure" : null
            ].filter(Boolean))) as MysteryCheckKind[];
            const rollFailures = { ...(foundFindable.rollFailures ?? {}) };
            let reachedDailyLimit = false;
            failedChecks.forEach((check) => {
              const failureKey = mysteryFindableFailureKey(check, mystery.day);
              const nextFailures = (rollFailures[failureKey] ?? 0) + 1;
              rollFailures[failureKey] = nextFailures;
              if (nextFailures >= 2) reachedDailyLimit = true;
            });
            findables = findables.map((findable) => findable.id === foundFindable.id ? { ...findable, rollFailures } : findable);
            if (roomPeople.length > 0) npcs = applyMysteryTrustDelta(npcs, roomPeople.map((person) => person.id), reachedDailyLimit ? -4 : -2);
          }
          const failReason = matchingMurder && foundProof
            ? `Whatever might be here, the house keeps it hidden for now.`
            : "You searched the room carefully, but found nothing.";
          messages.push({ id: uid(), speaker: "GM", text: failReason, roll: combinedRollText });
          ledgerLines.push(`Search/investigation found no new proof in ${mysteryRoomName(mystery, currentRoom)}. Difficulty ${searchDifficulty}; check ${searchCheck}; failure ${foundFindable && foundProof && !searchPassed ? searchFailureCount + 1 : searchFailureCount}${composureDifficulty ? `; composure difficulty ${composureDifficulty}; composure failure ${!composurePassed ? composureFailureCount + 1 : composureFailureCount}` : ""}.${combinedRollText ? ` ${combinedRollText}.` : ""}`);
        }
      } else if ((lower.includes("accuse") || lower.includes("arrest")) && namedSuspect && suspectMurders.length > 0) {
        if (discoveredProof.some((proof) => suspectProofs.includes(proof))) {
          finished = true;
          won = true;
          summary = `${mystery.player.firstName} proved ${fullName(namedSuspect)} was tied to the Ravenwood murders.`;
          medalEvents = addMysteryMedalEvents(medalEvents, [
            "killerCaught",
            "proofBearer",
            ...(mystery.daytime === "Night" || mystery.daytime === "Midnight" ? ["midnightCloser" as const] : [])
          ]);
          messages.push({ id: uid(), speaker: "GM", text: `${fullName(namedSuspect)} breaks under the weight of proof. The arrest is made before midnight can claim another name.`, roll: rollText });
          ledgerLines.push(`Win by arrest: accused ${fullName(namedSuspect)} with matching proof. Case finished.`);
        } else {
          const present = mysteryPeopleInRoom(workingMystery(), currentRoom).filter((person) => person.id !== mystery.player.id) as MysteryNpc[];
          npcs = applyMysteryTrustDelta(npcs, present.map((person) => person.id), -7);
          messages.push({ id: uid(), speaker: "GM", text: `${fullName(namedSuspect)} smiles at the accusation. Without proof, the room turns against you.`, roll: rollText });
          ledgerLines.push(`Failed accusation: ${fullName(namedSuspect)} is a real killer but no discovered proof matched yet.${rollText ? ` ${rollText}.` : ""}`);
        }
      } else if ((lower.includes("accuse") || lower.includes("arrest")) && namedSuspect) {
        const present = mysteryPeopleInRoom(workingMystery(), currentRoom).filter((person) => person.id !== mystery.player.id) as MysteryNpc[];
        npcs = applyMysteryTrustDelta(npcs, present.map((person) => person.id), -9);
        messages.push({ id: uid(), speaker: "GM", text: `Your accusation has no grounds, and so Ravenwood's residents refuse to listen to you.`, roll: rollText });
        ledgerLines.push(`False/unsupported accusation against ${fullName(namedSuspect)}; trust -9 for present residents.${rollText ? ` ${rollText}.` : ""}`);
      } else if ((lower.includes("kill") || lower.includes("attack") || lower.includes("shoot") || lower.includes("stab")) && namedSuspect && suspectMurders.length > 0) {
        finished = true;
        won = true;
        summary = `${mystery.player.firstName} killed ${fullName(namedSuspect)} and ended the murders.`;
        npcs = npcs.map((npc) => npc.id === namedSuspect.id ? { ...npc, alive: false } : npc);
        medalEvents = addMysteryMedalEvents(medalEvents, [
          "killerCaught",
          "bloodyJustice",
          ...(mystery.daytime === "Night" || mystery.daytime === "Midnight" ? ["midnightCloser" as const] : [])
        ]);
        messages.push({ id: uid(), speaker: "GM", text: `${fullName(namedSuspect)} dies before the house can protect them. It is not clean justice, but Ravenwood survives.`, roll: rollText });
        ledgerLines.push(`Win by killing culprit: ${fullName(namedSuspect)} marked dead. Case finished.${rollText ? ` ${rollText}.` : ""}`);
      } else if (movementRoom && movementRoom.id !== mystery.currentRoomId) {
        ledgerLines.push(`Room description shown for ${movementRoom.name}.`);
      } else if (lower.match(/\b(eavesdrop|listen in|listen to .*conversation|overhear|spy on|sneak.*listen|listen.*secret)\b/)) {
        const listenRoll = rollResult?.check === "Stealth" ? rollResult : mysterySpecificRollOutcome("Stealth", workingMystery());
        const listenRollText = mysteryRollText(listenRoll);
        const present = mysteryPeopleInRoom(workingMystery(), currentRoom).filter((person) => person.id !== mystery.player.id) as MysteryNpc[];
        if (mysteryRollMeets(listenRoll, "medium")) {
          const line = present.length > 0
            ? `You keep still long enough to catch the shape of the room's conversation. ${fullName(present[0])} lowers their voice, but you uncover information about them: ${mysteryEavesdropSheetFact(present[0], workingMystery())}.`
            : `You listen from the edge of the room, but you hear nothing.`;
          messages.push({ id: uid(), speaker: "GM", text: line, roll: listenRollText, rich: mysteryNpcSegments(line, workingMystery()) });
          ledgerLines.push(`Eavesdropping succeeded in ${mysteryRoomName(mystery, currentRoom)}.${listenRollText ? ` ${listenRollText}.` : ""}`);
        } else {
          const affectedIds = present.length > 0 ? present.map((person) => person.id) : npcs.filter((npc) => npc.role === "Staff").map((npc) => npc.id);
          npcs = applyMysteryTrustDelta(npcs, affectedIds, -7);
          const line = present.length > 0
            ? `${present.slice(0, 2).map(fullName).join(", ")} notice you listening.`
            : `A staff member catches you listening.`;
          messages.push({ id: uid(), speaker: "GM", text: line, roll: listenRollText, rich: mysteryNpcSegments(line, workingMystery()) });
          recordSeriousCatch(`caught sneaking to listen in ${mysteryRoomName(mystery, currentRoom)}`);
          ledgerLines.push(`Eavesdropping failed in ${mysteryRoomName(mystery, currentRoom)}; trust -7 for immediate witnesses.${listenRollText ? ` ${listenRollText}.` : ""}`);
        }
      } else if (mysterySpeechIntent(text)) {
        const target = mysteryTargetNpc(text, workingMystery(), currentRoom);
        if (target) {
          conversationNpcId = target.id;
          conversationRoomId = currentRoom;
          const pendingWitnessMeeting = witnessInvitationNpcIds.includes(target.id) && !witnessKnowledgeDeliveredNpcIds.includes(target.id);
          const privateMeetingRoomId = mysteryPrivateMeetingRoomIdFor(target);
          const privateWitnessKnowledge = pendingWitnessMeeting && currentRoom === privateMeetingRoomId
            ? mysteryWitnessKnowledgeLinesFor(workingMystery(), target)
            : [];
          const dialogue = mysteryResidentReply(text, workingMystery(), target, rollResult);
          const aiTrustDelta = aiReply?.usedAi && typeof aiReply.trustDelta === "number" ? aiReply.trustDelta : undefined;
          const trustDelta = aiTrustDelta === undefined
            ? dialogue.trustDelta
            : clamp(
              dialogue.trustDelta + Math.trunc(aiTrustDelta / 2),
              -20,
              20
            );
          const romanceAllowed = mysteryCanPlayerHaveRomanceWithNpc(mystery.player, target);
          const proposedRomanceDelta = aiReply?.usedAi && typeof aiReply.romanceDelta === "number" ? aiReply.romanceDelta : dialogue.romanceDelta;
          const romanceDelta = romanceAllowed ? proposedRomanceDelta : Math.min(0, proposedRomanceDelta);
          const trustReaction = mysteryTrustShiftLine(target, trustDelta);
          const romanceReaction = mysteryRomanceShiftLine(target, romanceDelta, romanceAllowed, mysteryToneForText(text));
          const responseText = privateWitnessKnowledge.length > 0
            ? `${fullName(target)} closes the door before speaking. "${privateWitnessKnowledge.join(" ")} I came to you because I trust you enough to say it where no one else can hear."${trustReaction}${romanceReaction}`
            : `${aiReply?.usedAi ? aiReply.text : dialogue.message.text}${trustReaction}${romanceReaction}`;
          const memoryWrites = mysteryNpcConversationMemoryWrites(text, workingMystery(), target, trustDelta, romanceDelta, rollResult, mysteryReferencedInventoryItem(text, workingMystery()));
          if (memoryWrites.length > 0) {
            const existingNpcMemory = npcConversationMemory[target.id] ?? [];
            npcConversationMemory = {
              ...npcConversationMemory,
              [target.id]: [...existingNpcMemory, ...memoryWrites].slice(-8)
            };
          }
          npcs = npcs.map((npc) => npc.id === target.id ? { ...npc, trust: clamp(npc.trust + trustDelta, 0, 100), romance: clamp(npc.romance + romanceDelta, 0, 100), romanceRevealed: romanceAllowed && (npc.romanceRevealed || romanceDelta !== 0 || Boolean(aiReply?.revealRomance) || mysteryToneForText(text) === "flirt") } : npc);
          if (privateWitnessKnowledge.length > 0) {
            witnessInvitationNpcIds = witnessInvitationNpcIds.filter((npcId) => npcId !== target.id);
            witnessKnowledgeDeliveredNpcIds = Array.from(new Set([...witnessKnowledgeDeliveredNpcIds, target.id]));
            aiMemory = [...aiMemory, `${fullName(target)} privately told ${mystery.player.firstName}: ${privateWitnessKnowledge.join(" ")}`].slice(-120);
            medalEvents = addMysteryMedalEvents(medalEvents, ["witnessWhisperer"]);
            ledgerLines.push(`Witness knowledge delivered privately by ${fullName(target)} in ${mysteryRoomName(mystery, privateMeetingRoomId)}.`);
          }
          messages.push({
            id: uid(),
            speaker: "GM",
            text: responseText,
            roll: rollText,
            rich: mysteryNpcSegments(responseText, workingMystery())
          });
          ledgerLines.push(`Dialogue resolved with ${fullName(target)} using ${aiReply?.usedAi ? "AI" : "fallback"} reply. Trust delta ${trustDelta}; romance delta ${romanceDelta}; memory writes ${memoryWrites.length}.${rollText ? ` ${rollText}.` : ""}`);
        } else {
          const namedUnavailable = namedSuspect && currentMysteryNpcRoomId(workingMystery(), namedSuspect) !== currentRoom;
          if (namedUnavailable) {
            const line = `${fullName(namedSuspect)} has stepped away from ${mysteryRoomName(mystery, currentRoom)}. They must have excused themselves while the room shifted around you.`;
            messages.push({ id: uid(), speaker: "GM", text: line, roll: rollText, rich: mysteryNpcSegments(line, workingMystery()) });
            ledgerLines.push(`Dialogue target unavailable: ${fullName(namedSuspect)} is now in ${mysteryRoomName(workingMystery(), currentMysteryNpcRoomId(workingMystery(), namedSuspect))}.${rollText ? ` ${rollText}.` : ""}`);
          } else {
            const dialogue = mysteryDialogueMessage(text, workingMystery(), namedSuspect);
            messages.push({ ...dialogue, roll: rollText });
            ledgerLines.push(`Dialogue had no reachable NPC in ${mysteryRoomName(mystery, currentRoom)}.${rollText ? ` ${rollText}.` : ""}`);
          }
        }
      } else {
        const room = mysteryRoomName(mystery, currentRoom);
        const line = aiReply?.usedAi ? aiReply.text : mysteryReactiveRoomLine(workingMystery(), currentRoom);
        messages.push({ id: uid(), speaker: "GM", text: line, rich: mysteryNpcSegments(line, workingMystery()) });
        ledgerLines.push(`Free action resolved in ${room} using ${aiReply?.usedAi ? "AI" : "fallback"} reply.${rollText ? ` ${rollText}.` : ""}`);
      }

      if (!finished && (nextTime.day > 13 || (mystery.day === 13 && mystery.daytime === "Midnight"))) {
        finished = true;
        won = false;
        lossPending = true;
        summary = `${mystery.player.firstName} failed to solve Ravenwood before the thirteenth midnight.`;
        messages.push({ id: uid(), speaker: "GM", text: "The thirteenth midnight passes. The killer remains free. You leave Ravenwood Manor with a bitter feeling." });
        ledgerLines.push("Loss triggered: thirteenth midnight passed with no solved case.");
      } else if (!finished && (nextTime.daytime === "Breakfast" || nextTime.daytime === "Lunch")) {
        messages.push({ id: uid(), speaker: "System", text: `Most guests drift toward the Dining Room for ${nextTime.daytime.toLowerCase()}. The map reflects who is likely present there now.` });
        ledgerLines.push(`${nextTime.daytime} gathering triggered; dining room attendance recalculated by deterministic hash.`);
      }

      const currentRoomModel = rooms.find((room) => room.id === currentRoom);
      if (!finished && currentRoomModel && currentRoom !== mystery.playerRoomId && (currentRoomModel.kind === "guest" || currentRoomModel.kind === "staff" || currentRoomModel.kind === "service")) {
        const currentPrivateOccupants = mysteryPrivateRoomOccupantsAt(workingMystery(), currentRoom);
        const nextPrivateMystery = { ...workingMystery(), day: nextTime.day, daytime: nextTime.daytime };
        const nextPrivateOccupants = mysteryPrivateRoomOccupantsAt(nextPrivateMystery, currentRoom);
        const returningOccupants = nextPrivateOccupants.filter((npc) => !currentPrivateOccupants.some((currentNpc) => currentNpc.id === npc.id));
        const caughtBy = (occupants: MysteryNpc[], rollTextForCatch?: string) => {
          const keyTaken = mysteryInventoryKeyForRoom(inventory, currentRoomModel);
          if (keyTaken) inventory = mysteryRemoveOneInventoryItem(inventory, keyTaken);
          const roomOwnerIds = npcs
            .filter((npc) => npc.roomId === currentRoom || npc.stationRoomId === currentRoom)
            .map((npc) => npc.id);
          const occupantIds = new Set([...occupants.map((npc) => npc.id), ...roomOwnerIds]);
          npcs = npcs.map((npc) => {
            if (occupantIds.has(npc.id)) return { ...npc, trust: clamp(npc.trust - 22, 0, 100) };
            if (npc.role === "Staff") return { ...npc, trust: clamp(npc.trust - 14, 0, 100) };
            return npc;
          });
          hiddenInRoomId = undefined;
          hiddenFromNpcIds = [];
          rooms = rooms.map((room) =>
            room.id === currentRoom && room.kind !== "public" && room.id !== mystery.playerRoomId
              ? { ...room, accessible: false }
              : room
          );
          const caughtRoomId = currentRoom;
          currentRoom = "grand-hall";
          const occupantNames = occupants.slice(0, 3).map(fullName).join(", ");
          messages.push({
            id: uid(),
            speaker: "GM",
            text: `${occupantNames || "Someone"} catches you lurking in ${mysteryRoomName(mystery, caughtRoomId)}. ${keyTaken ? `The ${keyTaken} is taken from you, and ` : ""}staff escort you back to the Great Hall. Trust falls only with that room's occupants and the staff.`,
            roll: rollTextForCatch
          });
          recordSeriousCatch(`caught lurking in ${mysteryRoomName(mystery, caughtRoomId)}${keyTaken ? ` with ${keyTaken}` : ""}`);
          ledgerLines.push(`Trespass discovered in ${mysteryRoomName(mystery, caughtRoomId)} by ${occupantNames || "private occupants"}; key taken: ${keyTaken ?? "none"}; moved to Great Hall; room occupants trust -22, staff trust -14.${rollTextForCatch ? ` ${rollTextForCatch}.` : ""}`);
        };
        if (hiddenInRoomId === currentRoom && nextPrivateOccupants.length === 0) {
          messages.push({ id: uid(), speaker: "GM", text: `You wait until the footsteps leave ${mysteryRoomName(mystery, currentRoom)}. No one discovers you were hidden there.` });
          ledgerLines.push(`Hidden state cleared safely in ${mysteryRoomName(mystery, currentRoom)} after occupants left.`);
          hiddenInRoomId = undefined;
          hiddenFromNpcIds = [];
        } else if (hiddenInRoomId === currentRoom && nextPrivateOccupants.length > 0 && mysteryIsWaitOrHideText(text)) {
          messages.push({ id: uid(), speaker: "GM", text: `You stay hidden in ${mysteryRoomName(mystery, currentRoom)} while ${nextPrivateOccupants.slice(0, 2).map(fullName).join(", ")} remains nearby. If you wait until they leave, you will not be discovered.` });
          ledgerLines.push(`Player remained hidden in ${mysteryRoomName(mystery, currentRoom)} from ${nextPrivateOccupants.map(fullName).join(", ")}.`);
        } else if (hiddenInRoomId === currentRoom && nextPrivateOccupants.length > 0) {
          const hideRoll = mysterySpecificRollOutcome("Composure", workingMystery());
          const hideRollText = mysteryRollText(hideRoll);
          if (mysteryRollMeets(hideRoll, "hard")) {
            messages.push({ id: uid(), speaker: "GM", text: `You almost give yourself away, but hold still inside the cupboard. ${nextPrivateOccupants[0] ? fullName(nextPrivateOccupants[0]) : "The room's occupant"} does not notice you.`, roll: hideRollText });
            ledgerLines.push(`Hidden-room activity survived by hard Composure in ${mysteryRoomName(mystery, currentRoom)}.${hideRollText ? ` ${hideRollText}.` : ""}`);
          } else {
            caughtBy(nextPrivateOccupants, hideRollText);
          }
        } else if (returningOccupants.length > 0) {
          const hideRoll = mysterySpecificRollOutcome("Composure", workingMystery());
          const hideRollText = mysteryRollText(hideRoll);
          if (mysteryRollMeets(hideRoll, "medium")) {
            hiddenInRoomId = currentRoom;
            hiddenFromNpcIds = returningOccupants.map((npc) => npc.id);
            messages.push({ id: uid(), speaker: "GM", text: `A key turns in the door. Composure holds: you slip into a cupboard before ${returningOccupants.slice(0, 2).map(fullName).join(", ")} can see you. If you wait until they leave, you will not be discovered.`, roll: hideRollText });
            ledgerLines.push(`Private-room return survived by Composure in ${mysteryRoomName(mystery, currentRoom)}; hidden from ${returningOccupants.map(fullName).join(", ")}.${hideRollText ? ` ${hideRollText}.` : ""}`);
          } else {
            caughtBy(returningOccupants, hideRollText);
          }
        }
      }

      if (!finished) {
        const witnessInvitations = mysteryWitnessInvitationResolution(
          { ...workingMystery(), day: nextTime.day, daytime: nextTime.daytime },
          npcs,
          currentRoom,
          witnessInvitationNpcIds,
          witnessKnowledgeDeliveredNpcIds
        );
        if (witnessInvitations.messages.length > 0) {
          witnessInvitationNpcIds = witnessInvitations.invitedIds;
          messages.push(...witnessInvitations.messages);
          ledgerLines.push(...witnessInvitations.ledgerLines);
        }
      }

      if (aiReply?.summary) {
        aiConversationSummaries = [...aiConversationSummaries, aiReply.summary].slice(-80);
      }
      if (aiReply?.memoryWrites?.length) {
        const existingMemory = new Set(aiMemory);
        aiMemory = [...aiMemory, ...aiReply.memoryWrites.filter((item) => !existingMemory.has(item))].slice(-120);
      }
      if (aiReply?.mode) {
        ledgerLines.push(`AI reply accepted from ${aiReply.mode}; summary=${Boolean(aiReply.summary)}; memory writes=${aiReply.memoryWrites?.length ?? 0}.`);
      } else if (!aiReply) {
        ledgerLines.push("AI reply unavailable or rejected by validation; scripted fallback used.");
      }

      const turnMessageIds = new Set(messages.map((message) => message.id));
      const stampedMessages = stampMysteryMessages(
        [...mystery.messages, ...messages],
        mystery.day,
        mystery.daytime
      );

      const splitMessages = splitMysteryMessages(stampedMessages);
      const storyFocusMessageId =
        splitMessages.visible.find((message) => turnMessageIds.has(message.id) && message.speaker !== "Player")?.id ??
        splitMessages.visible.find((message) => turnMessageIds.has(message.id))?.id;
      journal = appendMysteryJournal(journal, splitMessages.archived);

      return {
        ...mystery,
        day: nextTime.day,
        daytime: nextTime.daytime,
        currentRoomId: currentRoom,
        messages: splitMessages.visible,
        storyFocusMessageId,
        journal,
        aiMemory,
        aiConversationSummaries,
        npcConversationMemory,
        conversationNpcId,
        conversationRoomId,
        hiddenInRoomId,
        hiddenFromNpcIds,
        witnessInvitationNpcIds,
        witnessKnowledgeDeliveredNpcIds,
        sanityLedger: [...(mystery.sanityLedger ?? []), ...ledgerLines].slice(-600),
        npcs,
        rooms,
        murders,
        discoveredProof,
        findables,
        inventory,
        medalEvents,
        rollAttemptLedger,
        seriousCatchCount,
        finished,
        won,
        summary,
        lossPending,
        pendingBodyDiscoveryPopup,
        closedDoorRoomId,
        closedDoorReturnRoomId
      };
    });
  }

  function submitMysteryInput() {
    void submitMysteryText();
  }

  function visitMysteryRoom(roomId: string) {
    if (!activeMystery || activeMystery.finished) return;
    const room = activeMystery.rooms.find((candidate) => candidate.id === roomId);
    if (!room || !mysteryPlayerCanAccessRoom(activeMystery, room)) return;
    patchMystery((mystery) => {
      const rooms = mystery.rooms.map((candidate) => candidate.id === roomId ? { ...candidate, accessible: true } : candidate);
      let npcs = mystery.npcs;
      let murders = mystery.murders;
      let pendingBodyDiscoveryPopup = mystery.pendingBodyDiscoveryPopup;
      const discoveryMurder = murders.find((murder) =>
        !murder.discovered &&
        !murder.solved &&
        !murder.prevented &&
        murder.roomId === roomId &&
        mysteryTimeHasArrived(mystery.day, mystery.daytime, murder.day, murder.daytime)
      );
      const roomMessages: StoryMessage[] = [
        mysteryRoomDescription(
          { ...mystery, rooms, currentRoomId: roomId, npcs, murders },
          roomId
        )
      ];
      const ledgerLines = [`Move: Day ${mystery.day} ${mystery.daytime}; ${mystery.player.firstName} moved from ${mysteryRoomName(mystery, mystery.currentRoomId)} to ${room.name}.`];
      if (discoveryMurder) {
        const victimName = mysteryNpcName(mystery, discoveryMurder.victimId);
        const bodyDiscoveryText = `You find ${victimName} dead in the ${mysteryRoomName(mystery, discoveryMurder.roomId)}. The cause of death appears to be ${discoveryMurder.method}.`;
        npcs = npcs.map((npc) => npc.id === discoveryMurder.victimId ? { ...npc, alive: false } : npc);
        murders = murders.map((candidate) => candidate === discoveryMurder ? { ...candidate, discovered: true } : candidate);
        roomMessages.push({ id: uid(), speaker: "GM", icon: "death", text: `Dead body found! ${bodyDiscoveryText}` });
        pendingBodyDiscoveryPopup = { title: "Dead Body Found!", text: bodyDiscoveryText };
        ledgerLines.push(`Murder discovered by player room entry: victim ${victimName}; killer ${mysteryNpcName(mystery, discoveryMurder.killerId)}; room ${mysteryRoomName(mystery, discoveryMurder.roomId)}; method ${discoveryMurder.method}.`);
      }
      const stampedMessages = stampMysteryMessages(
        [...mystery.messages, ...roomMessages],
        mystery.day,
        mystery.daytime
      );

      const splitMessages = splitMysteryMessages(stampedMessages);
      const roomMessageIds = new Set(roomMessages.map((message) => message.id));
      const storyFocusMessageId =
        splitMessages.visible.find((message) => roomMessageIds.has(message.id) && message.speaker !== "Player")?.id ??
        splitMessages.visible.find((message) => roomMessageIds.has(message.id))?.id;
      return {
        ...mystery,
        rooms,
        npcs,
        murders,
        currentRoomId: roomId,
        conversationNpcId: undefined,
        conversationRoomId: undefined,
        closedDoorRoomId: undefined,
        closedDoorReturnRoomId: undefined,
        messages: splitMessages.visible,
        storyFocusMessageId,
        journal: appendMysteryJournal(mystery.journal, splitMessages.archived),
        sanityLedger: [...(mystery.sanityLedger ?? []), ...ledgerLines].slice(-600),
        pendingBodyDiscoveryPopup
      };
    });
  }

  function standAtMysteryClosedDoor(roomId: string) {
    if (!activeMystery || activeMystery.finished) return;
    const room = activeMystery.rooms.find((candidate) => candidate.id === roomId);
    if (!room) return;
    if (mysteryPlayerCanAccessRoom(activeMystery, room)) {
      visitMysteryRoom(roomId);
      return;
    }
    patchMystery((mystery) => {
      const roomDoorName = /^Guest Room\b/i.test(room.name) ? room.name : `the ${room.name}`;
      const line = `You slip just inside ${roomDoorName}, but the room is still obscured and unsecured. You can try the lock if you have lock-picking tools, eavesdrop, wait for a safer moment, or find the right key.`;
      const doorMessage: StoryMessage = { id: uid(), speaker: "GM", text: line };
      const stampedMessages = stampMysteryMessages([...mystery.messages, doorMessage], mystery.day, mystery.daytime);
      const splitMessages = splitMysteryMessages(stampedMessages);
      return {
        ...mystery,
        currentRoomId: room.id,
        conversationNpcId: undefined,
        conversationRoomId: undefined,
        closedDoorRoomId: room.id,
        closedDoorReturnRoomId: mystery.currentRoomId === room.id ? mystery.closedDoorReturnRoomId : mystery.currentRoomId,
        messages: splitMessages.visible,
        storyFocusMessageId: splitMessages.visible.find((message) => message.id === doorMessage.id)?.id,
        journal: appendMysteryJournal(mystery.journal, splitMessages.archived),
        sanityLedger: [...(mystery.sanityLedger ?? []), `Closed-door prompt shown for ${room.name} from map.`].slice(-600)
      };
    });
    setScreen("mystery");
    scrollStoryTopFromCompassRef.current = true;
  }

  function leaveMysteryClosedDoor() {
    if (!activeMystery || activeMystery.finished || !activeMystery.closedDoorRoomId) return;
    patchMystery((mystery) => {
      const room = mystery.rooms.find((candidate) => candidate.id === mystery.closedDoorRoomId);
      const line = room ? `You step back from the closed door to ${room.name}.` : "You step back from the closed door.";
      const message: StoryMessage = { id: uid(), speaker: "GM", text: line };
      const stampedMessages = stampMysteryMessages([...mystery.messages, message], mystery.day, mystery.daytime);
      const splitMessages = splitMysteryMessages(stampedMessages);
      return {
        ...mystery,
        currentRoomId: mystery.closedDoorReturnRoomId ?? mystery.playerRoomId,
        closedDoorRoomId: undefined,
        closedDoorReturnRoomId: undefined,
        messages: splitMessages.visible,
        storyFocusMessageId: splitMessages.visible.find((candidate) => candidate.id === message.id)?.id,
        journal: appendMysteryJournal(mystery.journal, splitMessages.archived),
        sanityLedger: [...(mystery.sanityLedger ?? []), `Closed-door state cleared${room ? ` at ${room.name}` : ""}.`].slice(-600)
      };
    });
  }

  function tryMysteryDoorKey(room: MysteryRoom) {
    if (!activeMystery || activeMystery.finished) return;
    if (mysteryInventoryKeyForRoom(activeMystery.inventory, room)) {
      visitMysteryRoom(room.id);
      return;
    }
    patchMystery((mystery) => {
      const line = `You try your keys at ${room.name}, but none of them fit.`;
      const message: StoryMessage = { id: uid(), speaker: "GM", text: line };
      const stampedMessages = stampMysteryMessages([...mystery.messages, message], mystery.day, mystery.daytime);
      const splitMessages = splitMysteryMessages(stampedMessages);
      return {
        ...mystery,
        closedDoorRoomId: room.id,
        closedDoorReturnRoomId: mystery.currentRoomId === room.id ? mystery.closedDoorReturnRoomId : mystery.currentRoomId,
        messages: splitMessages.visible,
        storyFocusMessageId: splitMessages.visible.find((candidate) => candidate.id === message.id)?.id,
        journal: appendMysteryJournal(mystery.journal, splitMessages.archived),
        sanityLedger: [...(mystery.sanityLedger ?? []), `Wrong key tried at ${room.name}.`].slice(-600)
      };
    });
  }

  function closeMysteryLoss() {
    if (!activeMystery) return;
    patchMystery((mystery) => ({ ...mystery, lossPending: false }));
    setScreen("menu");
  }

  function closeBodyDiscoveryPopup() {
    if (!activeMystery) return;
    patchMystery((mystery) => ({ ...mystery, pendingBodyDiscoveryPopup: undefined }));
  }

  function closeMysteryArrivalPopup() {
    if (!activeMystery) return;
    patchMystery((mystery) => ({ ...mystery, pendingArrivalPopup: undefined }));
  }

  function mysterySolveCandidateNpcs(mystery: MysteryGame, murderIndex: number): MysteryNpc[] {
    const murder = mystery.murders[murderIndex];
    if (!murder) return [];
    const murderTime = mysteryTimeSortValue(murder.day, murder.daytime);
    return mystery.npcs.filter((npc) => {
      if (npc.id === murder.victimId) return false;
      const earlierDeath = mystery.murders.find((candidate) =>
        candidate.victimId === npc.id &&
        mysteryTimeSortValue(candidate.day, candidate.daytime) < murderTime
      );
      return !earlierDeath;
    });
  }

  function mysteryMurderTookPlace(mystery: MysteryGame, murder: MysteryMurder): boolean {
    return mysteryTimeHasArrived(mystery.day, mystery.daytime, murder.day, murder.daytime);
  }

  function openMysterySolve(murderIndex: number) {
    if (!activeMystery) return;
    const candidates = mysterySolveCandidateNpcs(activeMystery, murderIndex);
    setSolveMurderIndex(murderIndex);
    setAccusationKillerId(candidates[0]?.id ?? null);
    setAccusationProofName(activeMystery.inventory[0] ?? null);
    setAccusationMotiveText("");
    setAccusationDropdown(null);
  }

  function selectMysteryAccusationKiller(npcId: string) {
    setAccusationKillerId(npcId);
    setAccusationDropdown(null);
  }

  function selectMysteryAccusationProof(item: string) {
    setAccusationProofName(item);
    setAccusationDropdown(null);
  }

  function mysteryMotiveGuessMatches(actual: string, guess: string): boolean {
    const stopWords = new Set(["about", "after", "again", "because", "being", "could", "everyone", "from", "have", "that", "their", "them", "they", "this", "with", "would", "stop", "keep", "silence"]);
    const actualLower = actual.toLowerCase();
    const guessLower = guess.toLowerCase();
    const actualWords = actualLower.match(/[a-z]+/g)?.filter((word) => word.length >= 4 && !stopWords.has(word)) ?? [];
    const guessWords = new Set(guessLower.match(/[a-z]+/g) ?? []);
    const matches = Array.from(new Set(actualWords)).filter((word) => guessWords.has(word));
    if (matches.length >= 2) return true;
    if (/\b(debt|debts|gambling|money|owed|owing|borrowed|loan|ledger|unpaid|payback)\b/.test(actualLower) && /\b(debt|debts|gambling|money|owed|owe|loan|ledger|unpaid|payback|cash)\b/i.test(guessLower)) return true;
    if (/\b(inheritance|will)\b/.test(actualLower) && /\b(inheritance|will|heir|estate)\b/i.test(guessLower)) return true;
    if (/\b(forged|forgery|document|identity)\b/.test(actualLower) && /\b(forged|forgery|fake|document|identity|id)\b/i.test(guessLower)) return true;
    if (/\b(blackmail|silence money)\b/.test(actualLower) && /\b(blackmail|blackmailed|silence|money)\b/i.test(guessLower)) return true;
    if (/\b(stolen|stealing|theft|missing money|funds)\b/.test(actualLower) && /\b(stolen|stealing|theft|money|funds|embezzle|embezzlement)\b/i.test(guessLower)) return true;
    return (actualLower.includes("relationship") && /relationship|romance|dating|affair|lover|secret/i.test(guessLower)) || (actualLower.includes("police") && /police|report|tell|confess/i.test(guessLower));
  }

  function mysteryProofGuessMatches(mystery: MysteryGame, murderIndex: number, proofName: string | null): boolean {
    if (!proofName) return false;
    const lower = proofName.toLowerCase();
    return (mystery.findables ?? []).some((findable) =>
      findable.kind === "Proof" &&
      findable.relatedMurderIndex === murderIndex &&
      (mystery.inventory.includes(findable.name) || mystery.inventory.includes(mysteryFindablePlayerFacingNameValue(findable))) &&
      (
        findable.name.toLowerCase() === lower ||
        mysteryFindablePlayerFacingNameValue(findable).toLowerCase() === lower ||
        Boolean(findable.proofText?.toLowerCase().includes(lower))
      )
    );
  }

  function mysteryAccusationConfidence(mystery: MysteryGame, murderIndex: number, accusedId: string | null, proofName: string | null, motiveText: string): { label: string; color: string; rows: { label: string; value: string; good: boolean }[] } {
    const murder = mystery.murders[murderIndex];
    const victim = murder ? mysteryNpcName(mystery, murder.victimId) : "Unknown";
    const proofSelected = Boolean(proofName);
    const proofTied = mysteryProofGuessMatches(mystery, murderIndex, proofName);
    const motiveClear = murder ? mysteryMotiveGuessMatches(murder.motive, motiveText) : false;
    const selectedCount = [Boolean(murder), Boolean(accusedId), proofSelected, motiveClear || motiveText.trim().length >= 4].filter(Boolean).length;
    const strongCount = [Boolean(murder), Boolean(accusedId), proofTied, motiveClear].filter(Boolean).length;
    const label = strongCount >= 4
      ? "Strong case"
      : selectedCount >= 4 && (proofTied || motiveClear)
        ? "Promising case"
        : selectedCount >= 3
          ? "Incomplete case"
          : "Too thin";
    const color = strongCount >= 4 ? C.good : label === "Promising case" ? C.gold : C.warning;
    return {
      label,
      color,
      rows: [
        { label: "Victim", value: victim, good: Boolean(murder) },
        { label: "Killer", value: accusedId ? mysteryNpcName(mystery, accusedId) : "Choose a suspect", good: Boolean(accusedId) },
        { label: "Proof", value: proofName ? (proofTied ? "Tied to this murder" : "Selected, but feels weak") : "Choose proof", good: proofTied },
        { label: "Motive", value: motiveClear ? "Clear enough to argue" : motiveText.trim() ? "Still vague" : "Write a motive", good: motiveClear }
      ]
    };
  }

  function mysteryNoActiveMurdersRemain(murders: MysteryMurder[]): boolean {
    return murders.every((murder) => murder.solved || murder.prevented);
  }

  function submitMysteryAccusation() {
    if (!activeMystery || solveMurderIndex === null || !accusationKillerId) return;
    const murderIndex = solveMurderIndex;
    const accusedId = accusationKillerId;
    const proofName = accusationProofName;
    const motiveText = accusationMotiveText;
    const murder = activeMystery.murders[murderIndex];
    if (!murder) return;
    setSolveMurderIndex(null);
    setAccusationDropdown(null);
    patchMystery((mystery) => {
      const targetMurder = mystery.murders[murderIndex];
      if (!targetMurder) return mystery;
      const killerCorrect = accusedId === targetMurder.killerId;
      const proofCorrect = mysteryProofGuessMatches(mystery, murderIndex, proofName);
      const motiveCorrect = mysteryMotiveGuessMatches(targetMurder.motive, motiveText);
      const accusedName = mysteryNpcName(mystery, accusedId);
      const victimName = mysteryNpcName(mystery, targetMurder.victimId);
      const nowTime = mysteryTimeSortValue(mystery.day, mystery.daytime);
      let murders = mystery.murders;
      let npcs = mystery.npcs;
      let finished = mystery.finished;
      let won = mystery.won;
      let summary = mystery.summary;
      let lossPending = mystery.lossPending;
      let murdererAttackPending = mystery.murdererAttackPending;
      let medalEvents = [...(mystery.medalEvents ?? [])];
      const messages: StoryMessage[] = [];
      const ledgerLines: string[] = [];

      if (killerCorrect && (proofCorrect || motiveCorrect)) {
        const previouslyPrevented = new Set(murders.map((candidate, index) => candidate.prevented ? index : -1).filter((index) => index >= 0));
        murders = murders.map((candidate, index) => {
          if (index === murderIndex) return { ...candidate, solved: true, discovered: true };
          const future = mysteryTimeSortValue(candidate.day, candidate.daytime) > nowTime;
          if (future && (candidate.killerId === accusedId || candidate.victimId === accusedId)) return { ...candidate, prevented: true, discovered: true };
          return candidate;
        });
        const newlyPreventedCount = murders.filter((candidate, index) => candidate.prevented && !previouslyPrevented.has(index)).length;
        const newlySavedChild = murders.some((candidate, index) => candidate.prevented && !previouslyPrevented.has(index) && mystery.npcs.find((npc) => npc.id === candidate.victimId)?.isChild);
        const targetVictimWasChild = Boolean(mystery.npcs.find((npc) => npc.id === targetMurder.victimId)?.isChild);
        medalEvents = addMysteryMedalEvents(medalEvents, [
          "killerCaught",
          ...(proofCorrect ? ["proofBearer" as const] : []),
          ...(motiveCorrect && !proofCorrect ? ["motiveReader" as const] : []),
          ...(proofCorrect && motiveCorrect ? ["perfectSolve" as const] : []),
          ...(newlyPreventedCount >= 1 ? ["oneLifeSaved" as const] : []),
          ...(newlyPreventedCount >= 2 ? ["twoLivesSaved" as const] : []),
          ...(newlySavedChild ? ["childSaved" as const] : []),
          ...(targetVictimWasChild || newlySavedChild ? ["childMurdererCaught" as const] : []),
          ...(mystery.daytime === "Night" || mystery.daytime === "Midnight" ? ["midnightCloser" as const] : [])
        ]);
        const finalDay = mystery.day >= 13;
        const savedLine = newlyPreventedCount > 0 ? ` You saved ${newlyPreventedCount} ${newlyPreventedCount === 1 ? "life" : "lives"} in this mystery.` : "";
        const line = finalDay
          ? `${accusedName} is believed. The police take them away before Ravenwood can hide the truth again.${savedLine}`
          : `${accusedName} is believed. Staff lock them safely in a closet while the investigation continues.${savedLine}`;
        messages.push({ id: uid(), speaker: "GM", text: line });
        ledgerLines.push(`Murder ${murderIndex + 1} solved: killer correct=${killerCorrect}, proof correct=${proofCorrect}, motive correct=${motiveCorrect}; future murders prevented=${newlyPreventedCount}.`);
        if (mysteryNoActiveMurdersRemain(murders)) {
          finished = true;
          won = true;
          summary = newlyPreventedCount > 0
            ? `${mystery.player.firstName} solved the Ravenwood case early and saved ${newlyPreventedCount} ${newlyPreventedCount === 1 ? "life" : "lives"} in a single mystery. ${accusedName} was stopped before the remaining murders could happen.`
            : `${mystery.player.firstName} solved the Ravenwood case. ${accusedName} was stopped and the remaining danger in the house ended.`;
        }
        setAccusationFeedback({ title: "Victory", text: line, mode: "victory" });
      } else if (killerCorrect) {
        npcs = applyMysteryTrustDelta(npcs, npcs.filter((npc) => npc.alive).map((npc) => npc.id), -12);
        murdererAttackPending = true;
        const line = `You named ${accusedName}, and you were right, but without proof or a clear motive nobody believes you. Everyone leaves the room.`;
        messages.push({ id: uid(), speaker: "GM", text: line });
        ledgerLines.push(`Unbelieved true accusation for murder ${murderIndex + 1}; death pending.`);
        setAccusationFeedback({ title: "Nobody Believes You", text: `${line} The next click gives the killer an opening.`, mode: "loss", triggerDeath: true });
      } else {
        npcs = applyMysteryTrustDelta(npcs, [accusedId], -14);
        const line = `You accuse ${accusedName} of killing ${victimName}, but the accusation leaves the residents confused. Your trust with ${accusedName} drops significantly.`;
        messages.push({ id: uid(), speaker: "GM", text: line });
        ledgerLines.push(`Wrong accusation for murder ${murderIndex + 1}: accused ${accusedName}; actual killer ${mysteryNpcName(mystery, targetMurder.killerId)}.`);
        setAccusationFeedback({ title: "Wrong Accusation", text: line, mode: "warning" });
      }

      const stampedMessages = stampMysteryMessages([...mystery.messages, ...messages], mystery.day, mystery.daytime);
      const splitMessages = splitMysteryMessages(stampedMessages);
      return {
        ...mystery,
        npcs,
        murders,
        messages: splitMessages.visible,
        journal: appendMysteryJournal(mystery.journal, splitMessages.archived),
        sanityLedger: [...(mystery.sanityLedger ?? []), ...ledgerLines].slice(-600),
        medalEvents,
        finished,
        won,
        summary,
        lossPending,
        murdererAttackPending
      };
    });
  }

  function closeAccusationFeedback() {
    const feedback = accusationFeedback;
    setAccusationFeedback(null);
    if (feedback?.triggerDeath && activeMystery) {
      patchMystery((mystery) => ({
        ...mystery,
        finished: true,
        won: false,
        murdererAttackPending: false,
        medalEvents: addMysteryMedalEvents(mystery.medalEvents, ["tooRightToLive"]),
        summary: `${mystery.player.firstName} accused the true killer without enough proof. The murderer used the empty room after the accusation to kill them.`
      }));
    }
  }

  function focusMysteryNpc(npcId: string) {
    if (!activeMystery?.npcs.some((npc) => npc.id === npcId)) return;
    restoreMysteryRelationsScrollRef.current = false;
    setFocusedMysteryNpcId(npcId);
    setScreen("mysteryRelations");
  }

  function openMysteryFamilyTree(npcId: string) {
    if (!activeMystery?.npcs.some((npc) => npc.id === npcId)) return;
    restoreMysteryRelationsScrollRef.current = screen === "mysteryRelations" || restoreMysteryRelationsScrollRef.current;
    setSelectedMysteryTreeNpcId(npcId);
    setScreen("mysteryFamilyTree");
  }

  function pressMysteryFamilyTreeNode(npcId: string) {
    const now = Date.now();
    const previous = mysteryTreePressRef.current;
    if (previous?.npcId === npcId && now - previous.time <= 420) {
      mysteryTreePressRef.current = null;
      if (mysteryTreeSinglePressTimerRef.current) {
        clearTimeout(mysteryTreeSinglePressTimerRef.current);
        mysteryTreeSinglePressTimerRef.current = null;
      }
      focusMysteryNpc(npcId);
      return;
    }
    mysteryTreePressRef.current = { npcId, time: now };
    if (mysteryTreeSinglePressTimerRef.current) clearTimeout(mysteryTreeSinglePressTimerRef.current);
    mysteryTreeSinglePressTimerRef.current = setTimeout(() => {
      mysteryTreeSinglePressTimerRef.current = null;
      openMysteryFamilyTree(npcId);
    }, 240);
  }

  function dropMysteryNpcOn(targetId: string) {
    if (!draggingMysteryNpcId || draggingMysteryNpcId === targetId) {
      setDraggingMysteryNpcId(null);
      return;
    }
    patchMystery((mystery) => {
      const dragged = mystery.npcs.find((npc) => npc.id === draggingMysteryNpcId);
      if (!dragged) return mystery;
      const withoutDragged = mystery.npcs.filter((npc) => npc.id !== draggingMysteryNpcId);
      const adjustedTargetIndex = withoutDragged.findIndex((npc) => npc.id === targetId);
      if (adjustedTargetIndex < 0) return mystery;
      const npcs = [...withoutDragged.slice(0, adjustedTargetIndex), dragged, ...withoutDragged.slice(adjustedTargetIndex)];
      return { ...mystery, npcs };
    });
    setDraggingMysteryNpcId(null);
  }

  function mysteryFamilyLinks(mystery: MysteryGame): MysteryNpcRelationship[] {
    return mysteryRelationshipsWithSingleSpouses(mystery.npcRelationships ?? []).filter((relationship) =>
      relationship.kind === "Family" ||
      relationship.kind === "Marriage" ||
      relationship.kind === "Romance" ||
      relationship.kind === "Affair"
    );
  }

  function mysteryFamilyGraph(mystery: MysteryGame): MysteryFamilyGraph {
    return mysteryFamilyGraphFromSavedFacts(mystery);
  }

  function mysteryFamilyGraphHasEdges(graph: MysteryFamilyGraph): boolean {
    return (graph.links?.length ?? 0) > 0;
  }

  function mysteryFamilyTreeEdges(mystery: MysteryGame): MysteryFamilyTreeEdge[] {
    const graph = mysteryFamilyGraph(mystery);
    const structure = mysteryFamilyStructureFromLinks(mystery.npcs, graph);
    const byId = new Map(mystery.npcs.map((npc) => [npc.id, npc]));
    const fallbackFamilyEdge = (relationship: MysteryNpcRelationship): MysteryFamilyTreeEdge | null => {
      const baseEdge = (kind: MysteryFamilyTreeEdgeKind, fromId = relationship.fromId, toId = relationship.toId): MysteryFamilyTreeEdge => ({
        id: relationship.id,
        fromId,
        toId,
        kind
      });
      if (relationship.kind === "Marriage") return baseEdge("spouse");
      if (relationship.kind === "Romance") return baseEdge("partner");
      if (relationship.kind === "Affair") return baseEdge("lover");
      if (relationship.kind !== "Family") return null;
      const from = byId.get(relationship.fromId);
      const to = byId.get(relationship.toId);
      if (!from || !to) return null;
      const detail = relationship.detail.toLowerCase();
      const fromName = fullName(from).toLowerCase();
      const toName = fullName(to).toLowerCase();
      if (detail.includes("siblings")) return baseEdge("sibling");
      if (detail.includes("cousins")) return baseEdge("cousin");
      if (detail.includes(`${fromName} is parent to ${toName}`)) return baseEdge("parentChild", from.id, to.id);
      if (detail.includes(`${toName} is parent to ${fromName}`)) return baseEdge("parentChild", to.id, from.id);
      if (detail.includes(`${fromName} is staying with mother ${toName}`) || detail.includes(`${fromName} is staying with father ${toName}`)) return baseEdge("parentChild", to.id, from.id);
      if (detail.includes(`${toName} is staying with mother ${fromName}`) || detail.includes(`${toName} is staying with father ${fromName}`)) return baseEdge("parentChild", from.id, to.id);
      if (detail.includes(`${fromName} is staying with aunt ${toName}`) || detail.includes(`${fromName} is staying with uncle ${toName}`)) return baseEdge("auntUncleNibling", to.id, from.id);
      if (detail.includes(`${toName} is staying with aunt ${fromName}`) || detail.includes(`${toName} is staying with uncle ${fromName}`)) return baseEdge("auntUncleNibling", from.id, to.id);
      if (
        detail.includes(`${fromName} is staying with older sister ${toName}`) ||
        detail.includes(`${fromName} is staying with older brother ${toName}`) ||
        detail.includes(`${toName} is staying with older sister ${fromName}`) ||
        detail.includes(`${toName} is staying with older brother ${fromName}`)
      ) return baseEdge("sibling");
      return null;
    };
    const graphEdges: MysteryFamilyTreeEdge[] = [
      ...structure.parentChild.map((item) => ({ id: `parent-child-${item.parentId}-${item.childId}`, fromId: item.parentId, toId: item.childId, kind: "parentChild" as const })),
      ...structure.siblings.map((item) => ({ id: `sibling-${mysteryGraphPairKey(item.aId, item.bId)}`, fromId: item.aId, toId: item.bId, kind: "sibling" as const })),
      ...structure.spouses.map((item) => ({ id: `spouse-${mysteryGraphPairKey(item.aId, item.bId)}`, fromId: item.aId, toId: item.bId, kind: "spouse" as const })),
      ...structure.partners.map((item) => ({ id: `partner-${mysteryGraphPairKey(item.aId, item.bId)}`, fromId: item.aId, toId: item.bId, kind: "partner" as const })),
      ...structure.lovers.map((item) => ({ id: `lover-${mysteryGraphPairKey(item.aId, item.bId)}`, fromId: item.aId, toId: item.bId, kind: "lover" as const })),
      ...structure.cousins.map((item) => ({ id: `cousin-${mysteryGraphPairKey(item.aId, item.bId)}`, fromId: item.aId, toId: item.bId, kind: "cousin" as const })),
      ...structure.auntUncleNibling.map((item) => ({ id: `aunt-uncle-${item.auntUncleId}-${item.niblingId}`, fromId: item.auntUncleId, toId: item.niblingId, kind: "auntUncleNibling" as const }))
    ];
    const fallbackEdges: MysteryFamilyTreeEdge[] = mysteryFamilyLinks(mystery).flatMap((item) => {
      const edge = fallbackFamilyEdge(item);
      return edge ? [edge] : [];
    });
    const sourceEdges = graphEdges.length > 0 ? graphEdges : fallbackEdges;
    const seen = new Set<string>();
    const priorityFor = (kind: MysteryFamilyTreeEdgeKind) =>
      kind === "spouse" ? 7 :
        kind === "partner" ? 6 :
          kind === "lover" ? 5 :
            kind === "parentChild" ? 4 :
              kind === "sibling" || kind === "cousin" || kind === "auntUncleNibling" ? 3 : 1;
    return [...sourceEdges].sort((a, b) => priorityFor(b.kind) - priorityFor(a.kind)).filter((edge) => {
      const romanticKey = edge.kind === "spouse" || edge.kind === "partner" || edge.kind === "lover"
        ? `romantic:${mysteryGraphPairKey(edge.fromId, edge.toId)}`
        : null;
      if (romanticKey && seen.has(romanticKey)) return false;
      if (romanticKey) seen.add(romanticKey);
      const key = `${edge.kind}:${mysteryGraphPairKey(edge.fromId, edge.toId)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function mysteryFamilyGraphEdges(mystery: MysteryGame): { fromId: string; toId: string; kind: MysteryFamilyTreeEdgeKind }[] {
    const edges = mysteryFamilyTreeEdges(mystery).map((edge) => ({ fromId: edge.fromId, toId: edge.toId, kind: edge.kind }));
    const seen = new Set<string>();
    return edges.filter((edge) => {
      const key = mysteryGraphPairKey(edge.fromId, edge.toId);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function mysteryResidentFamilyMembers(mystery: MysteryGame, rootId: string): MysteryNpc[] {
    const residentById = new Map(mystery.npcs.map((npc) => [npc.id, npc]));
    const root = residentById.get(rootId);
    if (!root) return [];
    const links = mysteryFamilyGraphEdges(mystery);
    const keepDepth = new Map<string, number>([[root.id, 0]]);
    const pending = [root.id];
    let displayedCousins = 0;
    while (pending.length > 0) {
      const currentId = pending.shift()!;
      const depth = keepDepth.get(currentId) ?? 0;
      if (depth >= 2) continue;
      for (const link of links) {
        const nextId = link.fromId === currentId ? link.toId : link.toId === currentId ? link.fromId : null;
        const next = nextId ? residentById.get(nextId) : undefined;
        if (!nextId || keepDepth.has(nextId) || !next) continue;
        if (link.kind === "cousin" && currentId !== root.id) continue;
        const rootRelation = mysteryTreeRelationshipLabel(root, next, mystery);
        if (rootRelation?.includes("cousin")) {
          if (displayedCousins >= 3) continue;
          displayedCousins += 1;
        }
        keepDepth.set(nextId, depth + 1);
        pending.push(nextId);
      }
    }
    return mystery.npcs.filter((npc) => keepDepth.has(npc.id));
  }

  function sexedRelation(npc: MysteryNpc, female: string, male: string): string {
    return npc.sex === "Female" ? female : male;
  }

  function mysteryTreeGenerationDeltaForRelationLabel(label: string | null): number | null {
    if (!label) return null;
    const words = label.toLowerCase().split(/\s+/);
    const first = words[0] ?? "";
    const last = words[words.length - 1] ?? "";
    if (first === "grandmother" || first === "grandfather") return -2;
    if (first === "granddaughter" || first === "grandson") return 2;
    if (["mothers", "fathers"].includes(first)) return ["mother", "father"].includes(last) ? -2 : -1;
    if (["daughters", "sons"].includes(first)) return ["daughter", "son"].includes(last) ? 2 : 1;
    if (["mother", "father", "aunt", "uncle"].includes(first)) return -1;
    if (["daughter", "son", "step-daughter", "step-son", "niece", "nephew"].includes(first)) return 1;
    if (["mothers", "fathers", "aunts", "uncles"].includes(first)) return -1;
    if (["daughters", "sons", "nieces", "nephews"].includes(first)) return 1;
    if (["daughter", "son", "step-daughter", "step-son", "niece", "nephew"].includes(last) && ["sisters", "brothers", "cousins"].includes(first)) return 1;
    if (["mother", "father", "aunt", "uncle"].includes(last) && ["sisters", "brothers", "cousins"].includes(first)) return -1;
    return 0;
  }

  function mysteryParentAndSiblingSets(mystery: MysteryGame) {
    const graph = mysteryFamilyGraph(mystery);
    const structure = mysteryFamilyStructureFromLinks(mystery.npcs, graph);
    const parentPairs: { parentId: string; childId: string }[] = [...structure.parentChild];
    const siblingPairs = new Set<string>(structure.siblings.map((item) => mysteryGraphPairKey(item.aId, item.bId)));
    const pairKey = (a: string, b: string) => [a, b].sort().join(":");
    return { parentPairs, siblingPairs, pairKey };
  }

  function directMysteryTreeRelationshipLabel(root: MysteryNpc, npc: MysteryNpc, mystery: MysteryGame): string | null {
    const graph = mysteryFamilyGraph(mystery);
    const structure = mysteryFamilyStructureFromLinks(mystery.npcs, graph);
    const direct = mysteryDirectFamilyRelationLabel(npc, root, structure);
    if (direct) return direct;
    if (mysteryFamilyGraphHasEdges(graph)) return null;
    const link = mysteryFamilyLinks(mystery).find((relationship) =>
      (relationship.fromId === root.id && relationship.toId === npc.id) ||
      (relationship.fromId === npc.id && relationship.toId === root.id)
    );
    if (!link) return null;
    if (link.kind === "Marriage") return "spouse";
    if (link.kind === "Romance") return "partner";
    if (link.kind === "Affair") return "lover";
    const detail = link.detail.toLowerCase();
    const rootName = fullName(root).toLowerCase();
    const npcName = fullName(npc).toLowerCase();
    if (detail.includes("siblings")) return sexedRelation(npc, "sister", "brother");
    if (detail.includes("cousins")) return "cousin";
    if (detail.includes(`${npcName} is parent to ${rootName}`)) return sexedRelation(npc, "mother", "father");
    if (detail.includes(`${rootName} is parent to ${npcName}`)) return sexedRelation(npc, "daughter", "son");
    if (detail.includes(`${rootName} is staying with mother ${npcName}`) || detail.includes(`${rootName} is staying with father ${npcName}`)) return sexedRelation(npc, "mother", "father");
    if (detail.includes(`${npcName} is staying with mother ${rootName}`) || detail.includes(`${npcName} is staying with father ${rootName}`)) return sexedRelation(npc, "daughter", "son");
    if (detail.includes(`${rootName} is staying with aunt ${npcName}`) || detail.includes(`${rootName} is staying with uncle ${npcName}`)) return sexedRelation(npc, "aunt", "uncle");
    if (detail.includes(`${npcName} is staying with aunt ${rootName}`) || detail.includes(`${npcName} is staying with uncle ${rootName}`)) return sexedRelation(npc, "niece", "nephew");
    if (npc.familyRelationNote?.includes(fullName(root))) {
      const note = npc.familyRelationNote.toLowerCase();
      if (note.includes("daughter of") || note.includes("son of")) return sexedRelation(npc, "daughter", "son");
      if (note.includes("mother of") || note.includes("father of")) return sexedRelation(npc, "mother", "father");
      if (note.includes("niece of") || note.includes("nephew of")) return sexedRelation(npc, "niece", "nephew");
      if (note.includes("aunt of") || note.includes("uncle of")) return sexedRelation(npc, "aunt", "uncle");
      if (note.includes("sister of") || note.includes("brother of")) return sexedRelation(npc, "sister", "brother");
    }
    if (root.familyRelationNote?.includes(fullName(npc))) {
      const note = root.familyRelationNote.toLowerCase();
      if (note.includes("daughter of") || note.includes("son of")) return sexedRelation(npc, "mother", "father");
      if (note.includes("mother of") || note.includes("father of")) return sexedRelation(npc, "daughter", "son");
      if (note.includes("niece of") || note.includes("nephew of")) return sexedRelation(npc, "aunt", "uncle");
      if (note.includes("aunt of") || note.includes("uncle of")) return sexedRelation(npc, "niece", "nephew");
      if (note.includes("sister of") || note.includes("brother of")) return sexedRelation(npc, "sister", "brother");
    }
    return null;
  }

  function mysteryTreeRelationshipLabel(root: MysteryNpc, npc: MysteryNpc, mystery: MysteryGame): string {
    if (root.id === npc.id) return "";
    const graph = mysteryFamilyGraph(mystery);
    return mysteryStoredFamilyRelationLabel(npc, root, graph) ?? "";
  }

  function changeMysteryInventory(item: string, action: "Abandon") {
    if (!activeMystery || action !== "Abandon") return;
    patchMystery((mystery) => {
      const roomName = mysteryRoomName(mystery, mystery.currentRoomId);
      const droppedFindable: MysteryFindable = {
        id: uid(),
        kind: "Snatchable",
        origin: "Abandoned",
        name: item,
        description: `${mystery.player.firstName} dropped ${item} in ${roomName}. Any resident who passes through may pick it up.`,
        roomId: mystery.currentRoomId,
        availableDay: mystery.day,
        availableDaytime: mystery.daytime
      };
      const stampedMessages = stampMysteryMessages(
        [
          ...mystery.messages,
          {
            id: uid(),
            speaker: "GM" as const,
            text: `${mystery.player.firstName} abandons ${item} in the ${roomName}. It stays there until someone picks it up.`
          }
        ],
        mystery.day,
        mystery.daytime
      );

      const splitMessages = splitMysteryMessages(stampedMessages);
      return {
        ...mystery,
        inventory: mystery.inventory.filter((inventoryItem) => inventoryItem !== item),
        findables: [...(mystery.findables ?? []), droppedFindable],
        messages: splitMessages.visible,
        journal: appendMysteryJournal(mystery.journal, splitMessages.archived),
        sanityLedger: [
          ...(mystery.sanityLedger ?? []),
          `Abandoned item: ${item} dropped in ${roomName} on Day ${mystery.day} ${mystery.daytime}.`
        ].slice(-600)
      };
    });
  }

  function moveMysteryInventory(item: string, direction: -1 | 1) {
    patchMystery((mystery) => {
      const index = mystery.inventory.indexOf(item);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= mystery.inventory.length) return mystery;
      const inventory = [...mystery.inventory];
      [inventory[index], inventory[nextIndex]] = [inventory[nextIndex], inventory[index]];
      return { ...mystery, inventory };
    });
  }

  function dropMysteryInventoryOn(targetItem: string) {
    if (!draggingMysteryItem || draggingMysteryItem === targetItem) {
      setDraggingMysteryItem(null);
      return;
    }
    patchMystery((mystery) => {
      const draggedIndex = mystery.inventory.indexOf(draggingMysteryItem);
      const targetIndex = mystery.inventory.indexOf(targetItem);
      if (draggedIndex < 0 || targetIndex < 0) return mystery;
      const inventory = mystery.inventory.filter((item) => item !== draggingMysteryItem);
      inventory.splice(targetIndex, 0, draggingMysteryItem);
      return { ...mystery, inventory };
    });
    setDraggingMysteryItem(null);
  }

  function removeMystery(mysteryId: string) {
    setMysteries((current) => current.filter((mystery) => mystery.id !== mysteryId));
    if (activeMysteryId === mysteryId) setActiveMysteryId(null);
  }

  function openMysteryJournal(mysteryId: string | null, backScreen: Screen) {
    if (mysteryId) setActiveMysteryId(mysteryId);
    setMysteryJournalBackScreen(backScreen);
    setScreen("mysteryJournal");
  }

  function pressMedal(definition: MysteryMedalDefinition, mysteryId?: string) {
    if (!mysteryId) return;
    const now = Date.now();
    const previous = medalPressRef.current;
    if (previous?.medalId === definition.id && previous.mysteryId === mysteryId && now - previous.time <= 480) {
      medalPressRef.current = null;
      openMysteryJournal(mysteryId, "medals");
      return;
    }
    medalPressRef.current = { medalId: definition.id, mysteryId, time: now };
  }

  function Shell({
    children,
    menuBackground = false,
    scrollRef,
    onScroll,
    scrollEventThrottle
  }: {
    children: React.ReactNode;
    menuBackground?: boolean;
    scrollRef?: React.RefObject<ScrollView | null>;
    onScroll?: React.ComponentProps<typeof ScrollView>["onScroll"];
    scrollEventThrottle?: number;
  }) {
    const showMysteryBottomMenu = Boolean(activeMystery && !activeMystery.finished && ["mystery", "mysteryCharacter", "mysteryRelations", "mysteryFamilyTree", "mysteryMap", "mysteryJournal"].includes(screen));
    const backgroundSource = menuBackground ? menuBackgrounds[themeName] : appBackgroundForScreen(themeName, screen);
    const backgroundTint = menuBackground
      ? themeName === "dark" ? "rgba(4, 4, 7, 0.38)" : "rgba(255, 250, 242, 0.18)"
      : themeName === "dark" ? "rgba(4, 4, 7, 0.34)" : "rgba(255, 255, 255, 0.2)";
    const content = (
      <SafeAreaView style={[styles.safe, { backgroundColor: "transparent" }]}>
        <StatusBar barStyle={themeName === "dark" ? "light-content" : "dark-content"} />
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[styles.container, menuBackground && styles.menuContainer, showMysteryBottomMenu && styles.fixedBottomContent]}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
        >
          {children}
        </ScrollView>
        {showMysteryBottomMenu ? (
          <View style={[styles.fixedBottomMenu, { backgroundColor: themeName === "dark" ? "rgba(9, 9, 12, 0.94)" : "rgba(251, 246, 238, 0.94)" }]}>
            <MysteryBottomMenu />
          </View>
        ) : null}
      </SafeAreaView>
    );

    return (
      <ImageBackground source={backgroundSource} resizeMode="cover" style={styles.backgroundImage}>
        <View style={[styles.backgroundTint, { backgroundColor: backgroundTint }]}>{content}</View>
      </ImageBackground>
    );
  }

  function Card({ children }: { children: React.ReactNode }) {
    return <View style={[styles.card, { backgroundColor: C.panel, borderColor: C.line }]}>{children}</View>;
  }

  function IconDumpIcon({ name, size = 22, style, scaleBoost }: { name: IconDumpKey; size?: number; style?: StyleProp<ViewStyle>; scaleBoost?: number }) {
    const icon: IconAsset = iconAssets[name];
    const scale = Math.min(size / icon.width, size / icon.height) * (scaleBoost ?? icon.scale ?? 1);
    return (
      <View style={[styles.iconDumpFrame, { width: size, height: size }, style]}>
        <Image
          source={icon.source}
          resizeMode="stretch"
          style={[
            styles.iconDumpSheet,
            {
              width: icon.width * scale,
              height: icon.height * scale,
              left: (size - icon.width * scale) / 2 + (icon.offsetX ?? 0),
              top: (size - icon.height * scale) / 2 + (icon.offsetY ?? 0)
            }
          ]}
        />
      </View>
    );
  }

  function BottomMenuLabel({ icon, label }: { icon: IconDumpKey; label: string }) {
    return (
      <View style={styles.bottomMenuLabel}>
        <View style={styles.bottomMenuIconStage}>
          <IconDumpIcon name={icon} size={58} />
        </View>
        <Text style={[styles.bottomMenuText, { color: C.text }]}>{label}</Text>
      </View>
    );
  }

  function CompassMenuIcon() {
    const glowOpacity = compassGlow.interpolate({
      inputRange: [0, 0.35, 0.82, 1],
      outputRange: [0.45, 0.82, 0.62, 0.9]
    });
    const glowOpacitySoft = compassGlow.interpolate({
      inputRange: [0, 0.35, 0.82, 1],
      outputRange: [0.18, 0.38, 0.25, 0.45]
    });
    const glowScale = compassGlow.interpolate({
      inputRange: [0, 0.35, 0.82, 1],
      outputRange: [0.9, 1.02, 0.96, 1.08]
    });
    const glowScaleSoft = compassGlow.interpolate({
      inputRange: [0, 0.35, 0.82, 1],
      outputRange: [1, 1.09, 1.03, 1.13]
    });
    const glowDriftX = compassGlow.interpolate({
      inputRange: [0, 1],
      outputRange: [-1.5, 1.5]
    });
    const glowDriftY = compassGlow.interpolate({
      inputRange: [0, 1],
      outputRange: [1.2, -1.2]
    });
    const glowDriftAlt = compassGlow.interpolate({
      inputRange: [0, 1],
      outputRange: [1.4, -1.4]
    });
    const glowRotate = compassGlow.interpolate({
      inputRange: [0, 1],
      outputRange: ["-2deg", "2deg"]
    });
    return (
      <View style={styles.compassOuter}>
        {ravenwoodCompassGlowLayers.map((source, index) => (
          <Animated.Image
            key={`compass-glow-${index}`}
            source={source}
            resizeMode="cover"
            style={[
              styles.compassGlowImage,
              index % 2 === 0 ? styles.compassGlowImageWide : styles.compassGlowImageTall,
              {
                opacity: index % 2 === 0 ? glowOpacitySoft : glowOpacity,
                transform: [
                  { scale: index % 2 === 0 ? glowScaleSoft : glowScale },
                  { translateX: index % 2 === 0 ? glowDriftX : glowDriftAlt },
                  { translateY: index % 2 === 0 ? glowDriftY : glowDriftAlt },
                  { rotate: glowRotate }
                ]
              }
            ]}
          />
        ))}
        <Image source={ravenwoodCompassIcon} resizeMode="cover" style={styles.compassImage} />
      </View>
    );
  }

  function Button({ label, onPress, disabled = false, small = false, variant = "accent" }: { label: string; onPress: () => void; disabled?: boolean; small?: boolean; variant?: "accent" | "warning" | "neutral" }) {
    const backgroundColor = disabled ? C.panel2 : variant === "warning" ? C.warning : variant === "neutral" ? C.panel2 : C.accent;
    return (
      <Pressable onPress={disabled ? undefined : onPress} style={[styles.button, small && styles.buttonSmall, { backgroundColor, borderColor: C.line, opacity: disabled ? 0.55 : 1 }]}>
        <Text style={[styles.buttonText, { color: variant === "neutral" && !disabled ? C.text : "#fff", fontSize: small ? 14 : 17 }]}>{label}</Text>
      </Pressable>
    );
  }

  function Chip({ label, selected, onPress, disabled = false }: { label: string; selected: boolean; onPress: () => void; disabled?: boolean }) {
    return (
      <Pressable onPress={disabled ? undefined : onPress} style={[styles.chip, { backgroundColor: selected ? C.accent : C.panel2, borderColor: selected ? C.accent : C.line, opacity: disabled ? 0.5 : 1 }]}>
        <Text style={[styles.chipText, { color: selected ? "#fff" : C.text }]}>{label}</Text>
      </Pressable>
    );
  }

  function Field({ label, value, onChangeText, placeholder }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string }) {
    return (
      <View style={styles.field}>
        <Text style={[styles.label, { color: C.dim }]}>{label}</Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.dim}
          style={[styles.input, { backgroundColor: C.panel2, borderColor: C.line, color: C.text }]}
        />
      </View>
    );
  }

  function PortraitImage({ subject, size = "large", highlight = false }: { subject: PortraitSubject; size?: "hero" | "large" | "resident" | "map" | "tree" | "thumb"; highlight?: boolean }) {
    const initials = `${subject.firstName?.[0] ?? "?"}${subject.familyName?.[0] ?? ""}`.toUpperCase();
    const isHero = size === "hero";
    const isLarge = size === "large" || isHero;
    const isResident = size === "resident";
    const isMap = size === "map";
    const isTree = size === "tree";
    const ravenwoodPortrait = subject.ravenwoodPortraitKey ? ravenwoodPortraitByKey[subject.ravenwoodPortraitKey] : null;
    const frameStyle = isHero
      ? styles.portraitHeroFrame
      : isLarge
        ? styles.portraitImageFrame
        : isResident
          ? styles.portraitResidentFrame
          : isMap
            ? styles.portraitMapFrame
            : isTree
              ? styles.portraitTreeFrame
              : styles.portraitThumbFrame;
    const frameWidth = isHero ? 114 : isLarge ? 72 : isResident ? 92 : isMap ? 42 : isTree ? 52 : 36;
    const frameHeight = isHero ? 190 : isLarge ? 128 : isResident ? 156 : isMap ? 66 : isTree ? 86 : 62;
    if (ravenwoodPortrait) {
      const isStaffPortrait = ravenwoodPortrait.sourceKind === "staff";
      const isGuestPortrait = ravenwoodPortrait.sourceKind === "guest";
      const sourceWidth = ravenwoodPortrait.imageWidth;
      const sourceHeight = ravenwoodPortrait.imageHeight;
      const cropPaddingX = 0;
      const cropPaddingTop = 0;
      const cropPaddingBottom = 0;
      const cropX = clamp(ravenwoodPortrait.crop.x - cropPaddingX, 0, sourceWidth - 1);
      const cropY = clamp(ravenwoodPortrait.crop.y - cropPaddingTop, 0, sourceHeight - 1);
      const cropWidth = Math.min(sourceWidth - cropX, ravenwoodPortrait.crop.width + cropPaddingX * 2);
      const cropHeight = Math.min(sourceHeight - cropY, ravenwoodPortrait.crop.height + cropPaddingTop + cropPaddingBottom);
      const crop = {
        x: cropX,
        y: cropY,
        width: Math.max(1, cropWidth),
        height: Math.max(1, cropHeight)
      };
      const scaleBoost = isStaffPortrait
        ? isHero
          ? 1.08
          : isResident
            ? 1.08
            : isMap
              ? 1.06
              : isTree
                ? 1.18
                : 1.07
        : isHero
          ? 1.07
          : isResident
            ? 1.06
            : isMap
              ? 1.04
              : isTree
                ? 1.16
                : 1.05;
      const placementY = isStaffPortrait
        ? isHero
          ? 10
          : isResident
            ? 6
            : isMap
              ? 0
              : isTree
                ? 4
                : 5
        : isHero
          ? 3
          : isResident
            ? 2
            : isMap
              ? 0
              : isTree
                ? 3
                : 1;
      const scale = Math.max(frameWidth / crop.width, frameHeight / crop.height) * scaleBoost;
      const centeredTop = -crop.y * scale + (frameHeight - crop.height * scale) / 2 + placementY;
      const guestTopAnchoredTop = -crop.y * scale;
      const imageTop = isGuestPortrait && crop.height * scale > frameHeight ? guestTopAnchoredTop : centeredTop;
      return (
        <View style={[frameStyle, { borderColor: highlight ? C.accent : C.line, backgroundColor: C.panel2 }, highlight && isTree && styles.portraitTreeSelectedFrame, subject.alive === false && styles.deadPortraitFrame]}>
          <Image
            source={ravenwoodPortrait.source}
            resizeMode="stretch"
            style={[
              styles.ravenwoodPortraitSheet,
              {
                width: sourceWidth * scale,
                height: sourceHeight * scale,
                left: -crop.x * scale + (frameWidth - crop.width * scale) / 2,
                top: imageTop,
                opacity: subject.alive === false ? 0.56 : 1
              }
            ]}
          />
          {subject.alive === false ? <View pointerEvents="none" style={styles.deadPortraitWash} /> : null}
        </View>
      );
    }
    return (
      <View style={[frameStyle, styles.picturelessPortrait, { borderColor: highlight ? C.accent : C.line, backgroundColor: C.panel2 }, highlight && isTree && styles.portraitTreeSelectedFrame, subject.alive === false && styles.deadPortraitFrame]}>
        <Text style={[styles.picturelessInitials, { color: subject.alive === false ? C.dim : C.text, fontSize: isHero ? 46 : isLarge ? 28 : isResident ? 18 : 13 }]}>{initials}</Text>
        <Text style={[styles.picturelessMeta, { color: C.dim, fontSize: isHero ? 14 : isLarge ? 12 : isResident ? 9 : 8 }]}>{subject.sex}</Text>
        {subject.alive === false ? <View pointerEvents="none" style={styles.deadPortraitWash} /> : null}
      </View>
    );
  }

  function MysteryTrustPill({ npc }: { npc: MysteryNpc }) {
    const muted = !npc.alive;
    const altered = npc.substanceState === "drunk" || npc.substanceState === "high";
    const trust = effectiveMysteryTrust(npc);
    const showRomance = Boolean(activeMystery && npc.romanceRevealed && mysteryCanPlayerHaveRomanceWithNpc(activeMystery.player, npc));
    return (
      <View style={[styles.mysteryTrustPill, altered && styles.intoxicatedTrustPill, { borderColor: muted ? "#777" : altered ? "#ff2222" : C.good, backgroundColor: muted ? "rgba(70, 70, 74, 0.45)" : altered ? "rgba(255, 34, 34, 0.26)" : `${C.good}18` }]}>
        <Text style={[styles.mysteryTrustPillLabel, { color: muted ? "#c9c9c9" : altered ? "#ffdddd" : C.good }]}>{altered ? titleCase(npc.substanceState) : "Trust"}</Text>
        <Text style={[styles.mysteryTrustPillValue, { color: muted ? "#d2d2d2" : altered ? "#fff" : C.text }]}>{trust}</Text>
        {showRomance ? (
          <>
            <Text style={[styles.mysteryTrustPillLabel, styles.mysteryRomancePillLabel, { color: muted ? "#c9c9c9" : C.gold }]}>Romance</Text>
            <Text style={[styles.mysteryTrustPillValue, styles.mysteryRomancePillValue, { color: muted ? "#d2d2d2" : C.text }]}>{npc.romance}</Text>
          </>
        ) : null}
      </View>
    );
  }

  function openMysteryChatFromCompass() {
    scrollStoryTopFromCompassRef.current = true;
    setScreen("mystery");
    if (screen === "mystery") {
      setTimeout(() => {
        mysteryPageScrollRef.current?.scrollTo({ y: 0, animated: true });
        storyScrollRef.current?.scrollTo({ y: 0, animated: true });
        scrollStoryTopFromCompassRef.current = false;
      }, 0);
    }
  }

  function MysteryBottomMenu() {
    return (
      <View style={[styles.bottomMenu, { backgroundColor: C.panel, borderColor: C.line }]}>
        <Pressable onPress={() => setScreen("mysteryCharacter")} style={[styles.bottomMenuItem, { borderColor: C.line }]}>
          <BottomMenuLabel icon="bag" label="Inventory" />
        </Pressable>
        <Pressable onPress={() => setScreen("mysteryRelations")} style={[styles.bottomMenuItem, { borderColor: C.line }]}>
          <BottomMenuLabel icon="shadowPortrait" label="Residents" />
        </Pressable>
        <Pressable onPress={() => setScreen("mysteryMap")} style={[styles.bottomMenuItem, { borderColor: C.line }]}>
          <BottomMenuLabel icon="candle" label="Map" />
        </Pressable>
        <Pressable onPress={() => openMysteryJournal(null, "mystery")} style={[styles.bottomMenuItem, { borderColor: C.line }]}>
          <BottomMenuLabel icon="book" label="Journal" />
        </Pressable>
        <Pressable
          accessibilityLabel="Gameplay chat"
          onPress={openMysteryChatFromCompass}
          style={styles.compassMenuButton}
        >
          <CompassMenuIcon />
        </Pressable>
      </View>
    );
  }

  function MysteryHeader({ mystery }: { mystery: MysteryGame }) {
    return (
      <View style={styles.rowBetween}>
        <Button small label="Menu" onPress={() => setScreen("menu")} />
        <View style={styles.mysteryHeaderProfile}>
          <Text style={[styles.heading, styles.mysteryHeaderName, { color: C.text }]}>{mystery.player.firstName} {mystery.player.familyName}</Text>
        </View>
      </View>
    );
  }

  function MysteryMessageText({ message, mystery }: { message: StoryMessage; mystery: MysteryGame }) {
    const segments = message.rich ?? mysteryNpcSegments(message.text, mystery);
    const portraitNpc = message.portraitNpcId ? mystery.npcs.find((npc) => npc.id === message.portraitNpcId) : undefined;
    const messageText = (
      <Text style={[styles.body, { color: C.text }]}>
        {segments.map((segment, index) => (
          <Text
            key={`${message.id}-${index}`}
            onPress={segment.npcId ? () => focusMysteryNpc(segment.npcId!) : undefined}
            style={[
              segment.color ? { color: segment.color } : null,
              segment.npcId ? styles.clickableNpcName : null
            ]}
          >
            {segment.text}
          </Text>
        ))}
      </Text>
    );
    if (!message.icon && !portraitNpc) return messageText;
    return (
      <View style={styles.mysteryMessageIconRow}>
        <View style={[styles.mysteryMessageIconBubble, { borderColor: message.icon === "death" ? "#c41338" : C.line, backgroundColor: C.panel2 }]}>
          {portraitNpc ? <PortraitImage subject={portraitNpc} size="thumb" /> : message.icon ? <IconDumpIcon name={message.icon} size={42} /> : null}
        </View>
        <View style={styles.mysteryMessageIconText}>
          {messageText}
        </View>
      </View>
    );
  }

  function MysteryDoorActionButton({ icon, label, onPress, disabled = false }: { icon: IconDumpKey; label: string; onPress: () => void; disabled?: boolean }) {
    return (
      <Pressable onPress={disabled ? undefined : onPress} style={[styles.doorActionButton, { opacity: disabled ? 0.42 : 1 }]}>
        <IconDumpIcon name={icon} size={28} />
        <Text style={[styles.doorActionLabel, { color: C.text }]} numberOfLines={1}>{label}</Text>
      </Pressable>
    );
  }

  function MysteryClosedDoorActions({ mystery, room }: { mystery: MysteryGame; room: MysteryRoom }) {
    const hasLockpicks = mysteryPlayerHasLockpickingTools(mystery);
    const hasKey = Boolean(mysteryInventoryKeyForRoom(mystery.inventory, room));
    return (
      <View style={styles.roomActionPanel}>
        <View style={styles.rowBetween}>
          <Text style={[styles.storySpeaker, { color: C.gold }]}>CLOSED DOOR</Text>
          <Text style={[styles.rollText, styles.closedDoorRoomName, { color: C.dim }]} numberOfLines={1}>{room.name}</Text>
        </View>
        <View style={styles.doorActionGrid}>
          <MysteryDoorActionButton icon="magnifier" label="Eavesdrop" disabled={mysteryAiThinking} onPress={() => { void submitMysteryText(`I eavesdrop at the closed door to ${room.name}.`); }} />
          <MysteryDoorActionButton icon="shadowPortrait" label="Knock" disabled={mysteryAiThinking} onPress={() => { void submitMysteryText(`I knock on the door to ${room.name}.`); }} />
          <MysteryDoorActionButton icon="lockpicks" label="Pick Lock" disabled={mysteryAiThinking || !hasLockpicks} onPress={() => { void submitMysteryText(`I pick the lock on ${room.name}.`); }} />
          <MysteryDoorActionButton icon="key" label="Use Key" disabled={mysteryAiThinking || !hasKey} onPress={() => tryMysteryDoorKey(room)} />
        </View>
      </View>
    );
  }

  function MysteryRoomActionPanel({ mystery }: { mystery: MysteryGame }) {
    const room = mystery.rooms.find((candidate) => candidate.id === mystery.currentRoomId);
    if (!room || mystery.finished || mystery.closedDoorRoomId) return null;
    const people = mysteryPeopleInRoom(mystery, room.id).filter((person) => person.id !== mystery.player.id) as MysteryNpc[];
    const talkTarget = people[0];
    return (
      <View style={styles.roomActionPanel}>
        <View style={styles.rowBetween}>
          <Text style={[styles.storySpeaker, { color: C.gold }]}>WHAT CAN I DO HERE?</Text>
          <Text style={[styles.rollText, styles.closedDoorRoomName, { color: C.dim }]} numberOfLines={1}>{room.name}</Text>
        </View>
        <View style={styles.doorActionGrid}>
          <MysteryDoorActionButton icon="magnifier" label="Search" disabled={mysteryAiThinking} onPress={() => { void submitMysteryText(`I search the ${room.name}.`); }} />
          <MysteryDoorActionButton icon="pocketWatch" label="Watch" disabled={mysteryAiThinking} onPress={() => { void submitMysteryText(`I watch quietly in the ${room.name}.`); }} />
          <MysteryDoorActionButton icon="shadowPortrait" label="Talk" disabled={mysteryAiThinking || !talkTarget} onPress={() => { if (talkTarget) void submitMysteryText(`I talk to ${fullName(talkTarget)}.`); }} />
          <MysteryDoorActionButton icon="lockpicks" label="Sneak Around" disabled={mysteryAiThinking} onPress={() => { void submitMysteryText(`I sneak around the ${room.name}.`); }} />
        </View>
      </View>
    );
  }

  function MysteryStoryWindow({ mystery }: { mystery: MysteryGame }) {
    const visibleMessages = mystery.messages.slice(-5);
    const currentRoom = mysteryRoomName(mystery, mystery.currentRoomId);
    const closedDoorRoom = mystery.closedDoorRoomId ? mystery.rooms.find((room) => room.id === mystery.closedDoorRoomId) : undefined;
    const roomBackground = ravenwoodRoomBackgroundFor(mystery, themeName);
    const frameStyle = [styles.storyFrame, styles.mysteryStoryFrame, { borderColor: C.line, backgroundColor: C.panel }];
    const sceneHeaderStyle = [styles.mysterySceneHeader, styles.ravenwoodBubbleBackdrop, { backgroundColor: themeName === "dark" ? "rgba(20, 18, 23, 0.76)" : "rgba(239, 232, 220, 0.74)", borderColor: "rgba(240, 196, 92, 0.28)" }];
    const storyPanelStyle = [styles.storyTextPanel, styles.mysteryTextPanelWide, styles.ravenwoodBubbleBackdrop, { backgroundColor: themeName === "dark" ? "rgba(10, 9, 10, 0.82)" : "rgba(255, 250, 242, 0.82)", borderColor: C.line }];
    const inputPanelStyle = [styles.storyInputPanel, styles.ravenwoodBubbleBackdrop, { backgroundColor: themeName === "dark" ? "rgba(10, 9, 10, 0.78)" : "rgba(255, 250, 242, 0.82)", borderColor: C.line }];
    const aiStatus = ravenwoodAiStatus;
    const aiStatusLine = aiStatus
      ? `${aiStatus.platform} | ${aiStatus.modelExists ? "model saved" : "no model"} | ${aiStatus.loaded ? "loaded" : "not loaded"}`
      : "AI status not checked";
    const aiStatusColor = aiStatus?.loaded ? C.good : aiStatus?.nativeCapable ? C.dim : C.warning;
    const sceneHeaderContent = (
      <>
        <PortraitImage subject={mysteryPlayerPortraitSubject(mystery.player)} size="large" highlight />
        <View style={styles.mysterySceneMeta}>
          <Text style={styles.storyPlaceLabel}>Day</Text>
          <View style={styles.mysterySceneMetaRow}>
            <Text style={styles.storyYearNumber}>{mystery.day}</Text>
            <View style={styles.mysteryScenePlaceBlock}>
              <Text style={styles.storyPlaceSmall}>{mystery.daytime}</Text>
              <Text style={styles.mysteryScenePlaceName}>{currentRoom}</Text>
            </View>
          </View>
        </View>
      </>
    );
    const storyPanelContent = (
      <View style={styles.mysteryChatInsideStack}>
        <ScrollView ref={storyScrollRef} style={[styles.storyMessages, styles.mysteryStoryMessages]}>
          {visibleMessages.map((message) => (
            <View
              key={message.id}
              style={styles.storyMessageBlock}
              onLayout={(event: LayoutChangeEvent) => {
                storyMessageOffsetsRef.current[message.id] = event.nativeEvent.layout.y;
              }}
            >
              <Text style={[styles.storySpeaker, { color: message.speaker === "Player" ? C.accent : C.gold }]}>{message.speaker}</Text>
              {message.speaker === "GM" ? <MysteryMessageText message={message} mystery={mystery} /> : <Text style={[styles.body, { color: C.text }]}>{message.text}</Text>}
              {message.roll ? <Text style={[styles.rollText, { color: C.dim }]}>{message.roll}</Text> : null}
            </View>
          ))}
        </ScrollView>
        {closedDoorRoom && !mystery.finished ? <MysteryClosedDoorActions mystery={mystery} room={closedDoorRoom} /> : <MysteryRoomActionPanel mystery={mystery} />}
      </View>
    );
    const inputPanelContent = (
      <>
        <TextInput
          value={mysteryInput}
          onChangeText={(value) => setMysteryInput(value.slice(0, 500))}
          placeholder="Write what your detective tries..."
          placeholderTextColor={C.dim}
          multiline
          maxLength={500}
          editable={!mystery.finished && !mysteryAiThinking}
          style={[styles.storyInput, { color: C.text }]}
        />
        <View style={styles.storySendButton}>
          <Button small label={mysteryAiThinking ? "Thinking" : "Send"} onPress={submitMysteryInput} disabled={mystery.finished || mysteryAiThinking || mysteryInput.trim().length === 0} />
        </View>
        <Text style={[styles.rollText, styles.storyCount, { color: C.dim }]}>{mysteryInput.length}/500</Text>
      </>
    );
    const aiTestPanelContent = (
      <View style={[styles.chatAiTestPanel, styles.ravenwoodBubbleBackdrop, { backgroundColor: themeName === "dark" ? "rgba(16, 14, 18, 0.82)" : "rgba(255, 250, 242, 0.86)", borderColor: C.line }]}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={[styles.storySpeaker, { color: C.gold }]}>AI TEST</Text>
            <Text style={[styles.rollText, { color: aiStatusColor }]}>{aiStatusLine}</Text>
          </View>
          <Button small label="Refresh" onPress={refreshRavenwoodAiStatus} variant="neutral" />
        </View>
        {aiStatus?.error ? <Text style={[styles.rollText, { color: C.warning }]}>{aiStatus.error}</Text> : null}
        <TextInput
          value={ravenwoodAiTestInput}
          onChangeText={(value) => setRavenwoodAiTestInput(value.slice(0, 220))}
          placeholder="Test AI using this mystery context..."
          placeholderTextColor={C.dim}
          multiline
          maxLength={220}
          style={[styles.chatAiTestInput, { color: C.text, borderColor: C.line, backgroundColor: C.panel2 }]}
        />
        <View style={styles.wrapRow}>
          <Button small label="Download" onPress={downloadRavenwoodAiModel} disabled={mysteryAiThinking} />
          <Button small label="Load" onPress={loadRavenwoodAiModel} disabled={mysteryAiThinking} />
          <Button small label={mysteryAiThinking ? "Testing" : "Test Here"} onPress={testRavenwoodAiModel} disabled={mysteryAiThinking || ravenwoodAiTestInput.trim().length === 0} />
        </View>
        {ravenwoodAiTestOutput ? <Text style={[styles.rollText, { color: C.text }]}>{ravenwoodAiTestOutput}</Text> : null}
      </View>
    );
    const frameContent = (
      <>
        <View style={sceneHeaderStyle}>{sceneHeaderContent}</View>
        <View style={storyPanelStyle}>{storyPanelContent}</View>
        <View style={inputPanelStyle}>{inputPanelContent}</View>
        {aiTestPanelContent}
      </>
    );
    return (
      roomBackground ? (
        <ImageBackground source={roomBackground} resizeMode="cover" imageStyle={styles.ravenwoodSceneBackdropImage} style={frameStyle}>
          {frameContent}
        </ImageBackground>
      ) : (
        <View style={frameStyle}>{frameContent}</View>
      )
    );
  }

  function MysterySolveButtons({ mystery }: { mystery: MysteryGame }) {
    const availableMurders = mystery.murders
      .map((murder, index) => ({ murder, index }))
      .filter(({ murder }) => mysteryMurderTookPlace(mystery, murder) && !murder.solved && !murder.prevented);
    if (availableMurders.length === 0 || mystery.finished) return null;
    return (
      <View style={styles.solveButtonRow}>
        {availableMurders.map(({ murder, index }) => (
          <Pressable key={`solve-${index}`} onPress={() => openMysterySolve(index)} style={styles.solveButton}>
            <Text style={styles.solveButtonText}>MURDER {index + 1} SOLVE</Text>
            <Text style={styles.solveButtonSub}>{mysteryNpcName(mystery, murder.victimId)}</Text>
          </Pressable>
        ))}
      </View>
    );
  }

  function MysteryAccusationModal({ mystery }: { mystery: MysteryGame }) {
    const murder = solveMurderIndex === null ? undefined : mystery.murders[solveMurderIndex];
    const candidates = solveMurderIndex === null ? [] : mysterySolveCandidateNpcs(mystery, solveMurderIndex);
    const accused = candidates.find((npc) => npc.id === accusationKillerId);
    const confidence = murder && solveMurderIndex !== null ? mysteryAccusationConfidence(mystery, solveMurderIndex, accusationKillerId, accusationProofName, accusationMotiveText) : null;
    const backdrop = appBackgroundForScreen(themeName, "mystery");
    return (
      <Modal visible={Boolean(murder)} transparent animationType="fade">
        <ImageBackground source={backdrop} resizeMode="cover" style={styles.modalShade}>
          <View style={[styles.modalCard, { backgroundColor: C.panel, borderColor: C.line }]}>
            <Text style={[styles.heading, { color: C.warning }]}>Solve Murder {solveMurderIndex !== null ? solveMurderIndex + 1 : ""}</Text>
            {confidence ? (
              <View style={[styles.accusationConfidencePanel, { borderColor: C.line, backgroundColor: C.panel2 }]}>
                <View style={styles.rowBetween}>
                  <Text style={[styles.storySpeaker, { color: C.gold }]}>CASE</Text>
                  <Text style={[styles.rollText, { color: confidence.color }]}>{confidence.label}</Text>
                </View>
                {confidence.rows.map((row) => (
                  <View key={row.label} style={styles.accusationConfidenceRow}>
                    <Text style={[styles.rollText, styles.accusationConfidenceLabel, { color: C.dim }]}>{row.label}</Text>
                    <Text style={[styles.rollText, styles.accusationConfidenceValue, { color: row.good ? C.good : C.warning }]} numberOfLines={2}>{row.value}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            <View style={styles.dropdownGroup}>
              <Pressable onPress={() => setAccusationDropdown((current) => current === "killer" ? null : "killer")} style={[styles.selectorRow, { borderColor: C.line, backgroundColor: C.panel2 }]}>
                <View style={styles.rowBetween}>
                  <Text style={[styles.rollText, { color: C.dim }]}>Killer</Text>
                  <Text style={[styles.dropdownArrow, { color: C.accent }]}>{accusationDropdown === "killer" ? "^" : "v"}</Text>
                </View>
                <Text style={[styles.body, { color: C.text }]}>{accused ? fullName(accused) : "Choose a suspect"}</Text>
              </Pressable>
              {accusationDropdown === "killer" ? (
                <ScrollView style={[styles.dropdownList, { borderColor: C.line, backgroundColor: C.panel2 }]} nestedScrollEnabled>
                  {candidates.length === 0 ? <Text style={[styles.body, styles.dropdownEmpty, { color: C.dim }]}>No valid suspects.</Text> : null}
                  {candidates.map((npc) => (
                    <Pressable key={npc.id} onPress={() => selectMysteryAccusationKiller(npc.id)} style={[styles.dropdownOption, { borderColor: C.line, backgroundColor: npc.id === accusationKillerId ? C.accent : "transparent" }]}>
                      <Text style={[styles.body, { color: npc.id === accusationKillerId ? "#fff" : C.text }]}>{fullName(npc)}</Text>
                      <Text style={[styles.rollText, { color: npc.id === accusationKillerId ? "#fff" : C.dim }]}>{npc.role} - {npc.sex} - age {npc.age}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}
            </View>
            <View style={styles.dropdownGroup}>
              <Pressable onPress={() => setAccusationDropdown((current) => current === "proof" ? null : "proof")} style={[styles.selectorRow, { borderColor: C.line, backgroundColor: C.panel2 }]}>
                <View style={styles.rowBetween}>
                  <Text style={[styles.rollText, { color: C.dim }]}>Proof From Inventory</Text>
                  <Text style={[styles.dropdownArrow, { color: C.accent }]}>{accusationDropdown === "proof" ? "^" : "v"}</Text>
                </View>
                <Text style={[styles.body, { color: C.text }]}>{accusationProofName ? displayMysteryItemName(accusationProofName) : "Choose proof"}</Text>
              </Pressable>
              {accusationDropdown === "proof" ? (
                <ScrollView style={[styles.dropdownList, { borderColor: C.line, backgroundColor: C.panel2 }]} nestedScrollEnabled>
                  {mystery.inventory.length === 0 ? <Text style={[styles.body, styles.dropdownEmpty, { color: C.dim }]}>No inventory items.</Text> : null}
                  {mystery.inventory.map((item) => (
                    <Pressable key={item} onPress={() => selectMysteryAccusationProof(item)} style={[styles.dropdownOption, styles.dropdownInventoryOption, { borderColor: C.line, backgroundColor: item === accusationProofName ? C.accent : "transparent" }]}>
                      <IconDumpIcon name={mysteryInventoryIconFor(item) ?? "document"} size={28} />
                      <Text style={[styles.body, styles.dropdownOptionText, { color: item === accusationProofName ? "#fff" : C.text }]}>{displayMysteryItemName(item)}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}
            </View>
            <TextInput
              value={accusationMotiveText}
              onChangeText={(value) => setAccusationMotiveText(value.slice(0, 280))}
              placeholder="Write the motive in your own words..."
              placeholderTextColor={C.dim}
              multiline
              maxLength={280}
              style={[styles.input, styles.accusationMotiveInput, { backgroundColor: C.panel2, borderColor: C.line, color: C.text }]}
            />
            <View style={styles.wrapRow}>
              <Button small label="Submit" onPress={submitMysteryAccusation} disabled={!accused} />
              <Button small label="Cancel" onPress={() => { setAccusationDropdown(null); setSolveMurderIndex(null); }} variant="neutral" />
            </View>
          </View>
        </ImageBackground>
      </Modal>
    );
  }

  function MysteryAccusationFeedbackModal() {
    const backdrop = appBackgroundForScreen(themeName, "mystery");
    return (
      <Modal visible={Boolean(accusationFeedback)} transparent animationType="fade">
        <ImageBackground source={backdrop} resizeMode="cover" style={styles.modalShade}>
          <View style={[styles.modalCard, { backgroundColor: C.panel, borderColor: C.line }]}>
            <Text style={[styles.heading, { color: accusationFeedback?.mode === "victory" ? C.good : C.warning }]}>{accusationFeedback?.title ?? ""}</Text>
            <Text style={[styles.body, { color: C.text }]}>{accusationFeedback?.text ?? ""}</Text>
            <Button label="Continue" onPress={closeAccusationFeedback} />
          </View>
        </ImageBackground>
      </Modal>
    );
  }

  function MysteryBodyDiscoveryModal({ mystery }: { mystery: MysteryGame }) {
    const popup = mystery.pendingBodyDiscoveryPopup;
    const backdrop = appBackgroundForScreen(themeName, "mystery");
    return (
      <Modal visible={Boolean(popup)} transparent animationType="fade">
        <ImageBackground source={backdrop} resizeMode="cover" style={styles.modalShade}>
          <View style={[styles.modalCard, styles.bodyDiscoveryCard, { backgroundColor: C.panel, borderColor: "#c41338" }]}>
            <View style={styles.bodyDiscoveryHeader}>
              <View style={[styles.mysteryMessageIconBubble, styles.bodyDiscoveryIconBubble, { borderColor: "#c41338", backgroundColor: C.panel2 }]}>
                <IconDumpIcon name="death" size={48} />
              </View>
              <Text style={[styles.heading, styles.bodyDiscoveryTitle, { color: "#ff5770" }]}>{popup?.title ?? ""}</Text>
              <Pressable onPress={closeBodyDiscoveryPopup} style={[styles.modalCloseButton, { borderColor: C.line, backgroundColor: C.panel2 }]}>
                <Text style={[styles.modalCloseText, { color: C.text }]}>X</Text>
              </Pressable>
            </View>
            <Text style={[styles.body, { color: C.text }]}>{popup?.text ?? ""}</Text>
          </View>
        </ImageBackground>
      </Modal>
    );
  }

  function MysteryArrivalPopupModal({ mystery }: { mystery: MysteryGame }) {
    const popup = mystery.pendingArrivalPopup;
    const backdrop = appBackgroundForScreen(themeName, "mystery");
    return (
      <Modal visible={Boolean(popup)} transparent animationType="fade">
        <ImageBackground source={backdrop} resizeMode="cover" style={styles.modalShade}>
          <View style={[styles.modalCard, styles.arrivalPopupCard, { backgroundColor: C.panel, borderColor: C.gold }]}>
            <Text style={[styles.heading, styles.arrivalPopupTitle, { color: C.gold }]}>Arrival at Ravenwood</Text>
            <View style={styles.arrivalPopupList}>
              {(popup?.entries ?? []).map((entry) => {
                const portraitNpc = entry.portraitNpcId ? mystery.npcs.find((npc) => npc.id === entry.portraitNpcId) : undefined;
                return (
                  <View key={entry.id} style={[styles.arrivalPopupRow, { borderColor: C.line, backgroundColor: C.panel2 }]}>
                    <View style={[styles.arrivalPopupIcon, { borderColor: entry.icon === "death" ? "#c41338" : C.line, backgroundColor: C.panel }]}>
                      {portraitNpc ? <PortraitImage subject={portraitNpc} size="thumb" /> : entry.icon ? <IconDumpIcon name={entry.icon} size={42} /> : null}
                    </View>
                    <View style={styles.arrivalPopupText}>
                      <Text style={[styles.storySpeaker, { color: C.gold }]}>{entry.title}</Text>
                      <Text style={[styles.body, { color: C.text }]}>{entry.text}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
            <Button label="Begin" onPress={closeMysteryArrivalPopup} />
          </View>
        </ImageBackground>
      </Modal>
    );
  }

  function MysteryFinishedReport({ mystery }: { mystery: MysteryGame }) {
    const happenedMurders = mystery.murders.filter((murder) =>
      !murder.prevented &&
      (murder.discovered || murder.solved || mysteryTimeHasArrived(mystery.day, mystery.daytime, murder.day, murder.daytime))
    );
    const preventedMurders = mystery.murders.filter((murder) => murder.prevented);
    const killers = Array.from(new Set(happenedMurders.map((murder) => murder.killerId)))
      .map((id) => mystery.npcs.find((npc) => npc.id === id))
      .filter((npc): npc is MysteryNpc => Boolean(npc));
    const victims = happenedMurders
      .map((murder) => mystery.npcs.find((npc) => npc.id === murder.victimId))
      .filter((npc): npc is MysteryNpc => Boolean(npc));
    const collectedFindables = (mystery.findables ?? []).filter((findable) => findable.collected || mystery.inventory.includes(findable.name) || mystery.inventory.includes(mysteryFindablePlayerFacingNameValue(findable)));
    const proofItems = collectedFindables.filter((findable) => findable.kind === "Proof");
    const notableItems = collectedFindables.filter((findable) => findable.kind !== "Proof").slice(0, 8);
    const trustedNpcs = mystery.npcs
      .filter((npc) => npc.trust >= 40 || npc.romance >= 20)
      .sort((a, b) => Math.max(b.trust, b.romance) - Math.max(a.trust, a.romance))
      .slice(0, 6);
    const uncoveredRelationships = mystery.npcRelationships
      .filter((relationship) => !relationship.hidden)
      .map((relationship) => {
        const from = mystery.npcs.find((npc) => npc.id === relationship.fromId);
        const to = mystery.npcs.find((npc) => npc.id === relationship.toId);
        if (!from || !to) return null;
        if (relationship.kind === "Family" || relationship.kind === "Marriage") {
          return mysteryRelationshipLinesFor(from, mystery.npcs, mystery.npcRelationships, mystery.day, mystery.daytime, mystery.player.firstName, mystery.familyGraph)
            .find((line) => line.includes(fullName(to))) ?? relationship.detail;
        }
        return mysteryRelationshipDetailForDisplay(relationship, from, to, mystery.npcs, mystery.player.firstName);
      })
      .filter((line): line is string => Boolean(line))
      .map(mysteryResidentRelationshipLineForDisplay)
      .slice(0, 8);
    const outcomeLine = mystery.summary ?? (mystery.won ? "The Ravenwood case was solved." : "The Ravenwood case ended unsolved.");
    return (
      <Shell>
        <View style={styles.rowBetween}>
          <Text style={[styles.titleSmall, { color: C.text }]}>Case Report</Text>
          <Button small label="Back" onPress={() => setScreen("past")} />
        </View>
        <Card>
          <View style={styles.reportHero}>
            <PortraitImage subject={mysteryPlayerPortraitSubject(mystery.player)} size="resident" highlight={mystery.won} />
            <View style={styles.reportHeroText}>
              <Text style={[styles.heading, { color: C.text }]}>{mystery.title}</Text>
              <Text style={[styles.body, { color: C.text }]}>{outcomeLine}</Text>
              <Text style={[styles.rollText, { color: mystery.won ? C.good : C.warning }]}>{mystery.won ? "Outcome: solved" : "Outcome: lost"} on Day {mystery.day} {mystery.daytime}</Text>
            </View>
          </View>
        </Card>
        <Card>
          <Text style={[styles.heading, { color: C.text }]}>Crimes</Text>
          {happenedMurders.length === 0 ? <Text style={[styles.body, { color: C.dim }]}>No murder was discovered before the case closed.</Text> : null}
          {happenedMurders.map((murder, index) => {
            const victim = mystery.npcs.find((npc) => npc.id === murder.victimId);
            const killer = mystery.npcs.find((npc) => npc.id === murder.killerId);
            const solvedText = murder.solved ? "Solved" : murder.discovered ? "Discovered" : "Unsolved";
            return (
              <View key={`report-murder-${index}`} style={[styles.reportCrimeRow, { borderColor: C.line }]}>
                {victim ? <PortraitImage subject={victim} size="thumb" /> : <IconDumpIcon name="death" size={44} />}
                <View style={styles.reportCrimeText}>
                  <Text style={[styles.body, { color: C.text }]}>Murder {index + 1}: {victim ? fullName(victim) : "Unknown victim"} in {mysteryRoomName(mystery, murder.roomId)}</Text>
                  <Text style={[styles.rollText, { color: C.dim }]}>Day {murder.day} {murder.daytime}. {murder.method}. {solvedText}.</Text>
                  <Text style={[styles.rollText, { color: C.text }]}>Killer: {killer ? fullName(killer) : "Unknown"}. Motive: {cleanSentenceEnd(murder.motive)}.</Text>
                </View>
              </View>
            );
          })}
          {preventedMurders.length > 0 ? (
            <Text style={[styles.body, { color: C.good }]}>
              Prevented: {preventedMurders.map((murder) => mysteryNpcName(mystery, murder.victimId)).join(", ")} survived because the case was stopped early.
            </Text>
          ) : null}
        </Card>
        <Card>
          <Text style={[styles.heading, { color: C.text }]}>Evidence</Text>
          {proofItems.length === 0 ? <Text style={[styles.body, { color: C.dim }]}>No proof was secured before the ending.</Text> : null}
          {proofItems.slice(0, 8).map((item) => (
              <View key={item.id} style={styles.reportItemRow}>
                <IconDumpIcon name={mysteryInventoryIconFor(item.name) ?? "document"} size={34} />
              <Text style={[styles.body, styles.reportItemText, { color: C.text }]}>{displayMysteryItemName(mysteryFindablePlayerFacingNameValue(item))}</Text>
            </View>
          ))}
          {notableItems.length > 0 ? <Text style={[styles.heading, styles.reportSubheading, { color: C.text }]}>Notable Items</Text> : null}
          {notableItems.map((item) => (
            <View key={item.id} style={styles.reportItemRow}>
              <IconDumpIcon name={mysteryInventoryIconFor(item.name) ?? "bag"} size={34} />
              <Text style={[styles.body, styles.reportItemText, { color: C.text }]}>{displayMysteryItemName(mysteryFindablePlayerFacingNameValue(item))}</Text>
            </View>
          ))}
        </Card>
        <Card>
          <Text style={[styles.heading, { color: C.text }]}>People</Text>
          {killers.length > 0 ? (
            <>
              <Text style={[styles.rollText, { color: C.dim }]}>Killer portrait{killers.length === 1 ? "" : "s"}</Text>
              <View style={styles.reportPortraitRow}>
                {killers.map((npc) => (
                  <View key={npc.id} style={styles.reportPortraitTile}>
                    <PortraitImage subject={npc} size="thumb" />
                    <Text style={[styles.rollText, styles.reportPortraitLabel, { color: C.warning }]}>{fullName(npc)}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}
          {victims.length > 0 ? (
            <>
              <Text style={[styles.rollText, { color: C.dim }]}>Victims</Text>
              <View style={styles.reportPortraitRow}>
                {victims.map((npc) => (
                  <View key={npc.id} style={styles.reportPortraitTile}>
                    <PortraitImage subject={npc} size="thumb" />
                    <Text style={[styles.rollText, styles.reportPortraitLabel, { color: C.text }]}>{fullName(npc)}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </Card>
        <Card>
          <Text style={[styles.heading, { color: C.text }]}>Bonds And Discoveries</Text>
          {trustedNpcs.length === 0 ? <Text style={[styles.body, { color: C.dim }]}>No strong resident bond was built before the case ended.</Text> : null}
          {trustedNpcs.map((npc) => (
            <View key={npc.id} style={styles.reportBondRow}>
              <PortraitImage subject={npc} size="thumb" />
              <View style={styles.reportCrimeText}>
                <Text style={[styles.body, { color: C.text }]}>{fullName(npc)}</Text>
                <Text style={[styles.rollText, { color: C.dim }]}>Trust {npc.trust}{npc.romance > 0 ? `, romance ${npc.romance}` : ""}</Text>
              </View>
            </View>
          ))}
          {uncoveredRelationships.length > 0 ? <Text style={[styles.heading, styles.reportSubheading, { color: C.text }]}>Uncovered Relationship Notes</Text> : null}
          {uncoveredRelationships.length === 0 ? <Text style={[styles.body, { color: C.dim }]}>No relationship notes were uncovered.</Text> : null}
          {uncoveredRelationships.map((line, index) => (
            <Text key={`report-relation-${index}`} style={[styles.body, { color: C.text }]}>{line}</Text>
          ))}
        </Card>
      </Shell>
    );
  }

  if (screen === "menu") {
    return (
      <Shell menuBackground>
        <Text style={[styles.title, styles.menuTextShadow, { color: C.text }]}>Ravenwood Mystery</Text>
        <Text style={[styles.subtitle, styles.menuTextShadow, { color: themeName === "dark" ? "#e7e1dc" : C.text }]}>Choose your charachter and investigate freely in your style.</Text>
        <Button label="Start New Mystery" onPress={() => setScreen("mysteryBookSelect")} />
        <Button label="Load Game" onPress={() => setScreen("load")} />
        <Button label="Finished Games" onPress={() => setScreen("past")} />
        <Button label="Medals Won" onPress={() => setScreen("medals")} />
        <Button label="Settings" onPress={() => setScreen("settings")} />
      </Shell>
    );
  }

  if (screen === "mysteryBookSelect") {
    return (
      <Shell>
        <View style={styles.rowBetween}>
          <Text style={[styles.titleSmall, { color: C.text }]}>Choose Book</Text>
          <Button small label="Back" onPress={() => setScreen("menu")} />
        </View>
        <Card>
          <Text style={[styles.heading, { color: C.text }]}>Ravenwood Murder Mystery</Text>
          <Text style={[styles.body, { color: C.text }]}>A sealed hotel, tangled residents, and a case that changes every run.</Text>
          <Button label="Choose Detective" onPress={() => setScreen("mysteryDetectiveSelect")} />
        </Card>
      </Shell>
    );
  }

  if (screen === "mysteryDetectiveSelect") {
    return (
      <Shell>
        <View style={styles.rowBetween}>
          <Text style={[styles.titleSmall, { color: C.text }]}>Choose Detective</Text>
          <Button small label="Back" onPress={() => setScreen("menu")} />
        </View>
        <ScrollView
          ref={detectiveCarouselRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onScroll={(event) => {
            detectiveCarouselOffsetRef.current = event.nativeEvent.contentOffset.x;
          }}
          scrollEventThrottle={16}
          contentContainerStyle={styles.detectiveCarousel}
        >
          {ravenwoodDetectiveProfiles.map((profile) => {
            const selected = selectedMysteryDetective.id === profile.id;
            return (
              <Pressable
                key={profile.id}
                onPress={() => chooseMysteryDetective(profile.id)}
                style={[styles.detectiveCard, { backgroundColor: selected ? C.panel2 : C.panel, borderColor: selected ? C.accent : C.line }]}
              >
                <PortraitImage subject={mysteryDetectivePortraitSubject(profile, 24)} size="hero" highlight={selected} />
                <Text style={[styles.heading, styles.detectiveName, { color: C.text }]}>{profile.firstName} {profile.familyName}</Text>
                <Text style={[styles.rollText, { color: C.dim }]}>{profile.sex} - age 24 portrait</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Button label="THIS IS MY DETECTIVE" onPress={confirmMysteryDetective} />
      </Shell>
    );
  }

  if (screen === "mysteryPortraitSelect") {
    return (
      <Shell>
        <View style={styles.rowBetween}>
          <Text style={[styles.titleSmall, { color: C.text }]}>Choose Portrait Age</Text>
          <Button small label="Back" onPress={() => setScreen("mysteryDetectiveSelect")} />
        </View>
        <Card>
          <Text style={[styles.heading, { color: C.text }]}>{selectedMysteryDetective.firstName} {selectedMysteryDetective.familyName}</Text>
          <Text style={[styles.body, { color: C.text }]}>The case will begin with this detective at the selected age.</Text>
          <View style={styles.detectiveAgeGrid}>
            {ravenwoodPlayerSelectableAges.map((age) => {
              const selected = selectedMysteryDetectiveAge === age;
              return (
                <Pressable
                  key={age}
                  onPress={() => setSelectedMysteryDetectiveAge(age)}
                  style={[styles.detectiveAgeCard, { backgroundColor: selected ? C.panel2 : C.panel, borderColor: selected ? C.accent : C.line }]}
                >
                  <PortraitImage subject={mysteryDetectivePortraitSubject(selectedMysteryDetective, age)} size="hero" highlight={selected} />
                  <Text style={[styles.heading, styles.detectiveAgeLabel, { color: C.text }]}>Age {age}</Text>
                </Pressable>
              );
            })}
          </View>
        </Card>
        <Button label="Start Case" onPress={startMystery} />
      </Shell>
    );
  }

  if (screen === "mystery" && activeMystery) {
    return Shell({
      scrollRef: mysteryPageScrollRef,
      children: (
        <>
          {MysteryHeader({ mystery: activeMystery })}

          {MysterySolveButtons({ mystery: activeMystery })}

          {MysteryStoryWindow({ mystery: activeMystery })}

          {activeMystery.finished
            ? Card({
                children: (
                  <>
                    <Text
                      style={[
                        styles.heading,
                        {
                          color: activeMystery.won
                            ? C.good
                            : C.warning
                        }
                      ]}
                    >
                      {activeMystery.won
                        ? "Case Won"
                        : "Case Lost"}
                    </Text>

                    <Text
                      style={[
                        styles.body,
                        { color: C.text }
                      ]}
                    >
                      {activeMystery.summary}
                    </Text>
                  </>
                )
              })
            : null}

          <Modal
            visible={Boolean(activeMystery.lossPending)}
            transparent
            animationType="fade"
          >
            <View style={styles.modalShade}>
              <View
                style={[
                  styles.modalCard,
                  {
                    backgroundColor: C.panel,
                    borderColor: C.line
                  }
                ]}
              >
                <Text
                  style={[
                    styles.heading,
                    { color: C.warning }
                  ]}
                >
                  Ravenwood Is Lost
                </Text>

                <Text
                  style={[
                    styles.body,
                    { color: C.text }
                  ]}
                >
                  The thirteenth midnight passes. The killer
                  remains free. You leave Ravenwood Manor with a
                  bitter feeling.
                </Text>

                {Button({
                  label: "Main Menu",
                  onPress: closeMysteryLoss
                })}
              </View>
            </View>
          </Modal>
          {MysteryArrivalPopupModal({ mystery: activeMystery })}
          {MysteryBodyDiscoveryModal({ mystery: activeMystery })}
          {MysteryAccusationModal({ mystery: activeMystery })}
          {MysteryAccusationFeedbackModal()}
        </>
      )
    });
  }

  if (screen === "mysteryCharacter" && activeMystery) {
    return (
      <Shell>
        <View style={styles.rowBetween}>
          <Text style={[styles.titleSmall, { color: C.text }]}>Character Inventory</Text>
          <Button small label="Back" onPress={() => setScreen("mystery")} />
        </View>
        <Card>
          <View style={styles.characterHeader}>
            <PortraitImage subject={mysteryPlayerPortraitSubject(activeMystery.player)} size="hero" highlight />
            <View style={styles.characterHeaderText}>
              <Text style={[styles.heading, { color: C.text }]}>{activeMystery.player.firstName} {activeMystery.player.familyName}</Text>
              <Text style={{ color: C.dim }}>{activeMystery.player.sex}</Text>
              <Text style={{ color: C.dim }}>Age {mysteryPlayerAge(activeMystery.player)}</Text>
              <Text style={{ color: C.dim }}>Room key: {mysteryRoomName(activeMystery, activeMystery.playerRoomId)}</Text>
              <Text style={{ color: C.dim }}>Current room: {mysteryRoomName(activeMystery, activeMystery.currentRoomId)}</Text>
              <Text style={{ color: C.dim }}>Day {activeMystery.day}, {activeMystery.daytime}</Text>
            </View>
          </View>
        </Card>
        <Card>
          <Text style={[styles.heading, { color: C.text }]}>Inventory</Text>
          {activeMystery.inventory.length === 0 ? <Text style={[styles.body, { color: C.text }]}>Nothing carried.</Text> : null}
          {activeMystery.inventory.map((item, index) => (
            <Pressable
              key={item}
              onLongPress={() => setDraggingMysteryItem(item)}
              onPress={draggingMysteryItem && draggingMysteryItem !== item ? () => dropMysteryInventoryOn(item) : undefined}
              style={[styles.itemRow, { borderColor: C.line }, draggingMysteryItem === item && styles.relationCardDragging]}
            >
              <View style={styles.itemNameRow}>
                {mysteryInventoryIconFor(item) ? (
                  <View style={styles.inventoryItemIconBubble}>
                    <IconDumpIcon name={mysteryInventoryIconFor(item)!} size={30} />
                  </View>
                ) : null}
                <Text style={[styles.body, styles.itemName, { color: C.text }]}>{displayMysteryItemName(item)}</Text>
              </View>
              <View style={styles.wrapRow}>
                <Button small label="Up" onPress={() => moveMysteryInventory(item, -1)} disabled={index === 0} />
                <Button small label="Down" onPress={() => moveMysteryInventory(item, 1)} disabled={index === activeMystery.inventory.length - 1} />
                <Button small label="Abandon" onPress={() => changeMysteryInventory(item, "Abandon")} variant="warning" />
              </View>
            </Pressable>
          ))}
        </Card>
        <Button label="Back" onPress={() => setScreen("mystery")} />
      </Shell>
    );
  }

  if (screen === "mysteryRelations" && activeMystery) {
    const focusedMysteryNpcs = focusedMysteryNpcId
      ? [
        ...activeMystery.npcs.filter((npc) => npc.id === focusedMysteryNpcId),
        ...activeMystery.npcs.filter((npc) => npc.id !== focusedMysteryNpcId)
      ]
      : activeMystery.npcs;
    return (
      <Shell
        scrollRef={mysteryRelationsScrollRef}
        onScroll={(event) => {
          mysteryRelationsScrollYRef.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        <View style={styles.rowBetween}>
          <Text style={[styles.titleSmall, { color: C.text }]}>Residents</Text>
          <Button small label="Back" onPress={() => setScreen("mystery")} />
        </View>
        {focusedMysteryNpcs.map((npc) => {
          const isDragging = draggingMysteryNpcId === npc.id;
          const familyStatus = mysteryDisplayFamilyStatus(npc, activeMystery);
          const relationshipLines = mysteryRelationshipLinesFor(npc, activeMystery.npcs, activeMystery.npcRelationships ?? [], activeMystery.day, activeMystery.daytime, activeMystery.player.firstName, mysteryFamilyGraph(activeMystery))
            .map(mysteryResidentRelationshipLineForDisplay)
            .filter(Boolean);
          return (
            <Pressable
              key={npc.id}
              onLongPress={() => setDraggingMysteryNpcId(npc.id)}
              onPress={draggingMysteryNpcId ? () => dropMysteryNpcOn(npc.id) : undefined}
              style={[styles.card, { backgroundColor: C.panel, borderColor: C.line }, focusedMysteryNpcId === npc.id && styles.focusedMysteryNpcCard, isDragging && styles.relationCardDragging, !npc.alive && styles.deadTile, !npc.alive && styles.deadRelationCard]}
            >
              <View style={styles.relationHeader}>
                <PortraitImage subject={npc} size="resident" />
                <View style={styles.residentHeaderBody}>
                  <View>
                    <Text style={[styles.heading, styles.relationName, { color: npc.alive ? C.text : C.dim }]}>{npc.firstName} {npc.familyName}</Text>
                    <Text style={{ color: C.dim }}>{npc.role} - {npc.sex} - age {npc.age}{npc.isChild ? " - Child" : ""}</Text>
                    {!npc.alive ? <Text style={{ color: C.warning }}>Dead</Text> : null}
                  </View>
                  <Pressable onPress={() => openMysteryFamilyTree(npc.id)} style={[styles.mysteryPortraitMagnifierButton, { backgroundColor: C.panel2, borderColor: C.line }]}>
                    <IconDumpIcon name="magnifier" size={54} scaleBoost={0.74} />
                  </Pressable>
                </View>
                <MysteryTrustPill npc={npc} />
              </View>
              {relationshipLines.length > 0 ? (
                <View style={[styles.relationshipLedgerBox, { borderColor: C.line, backgroundColor: C.panel2 }]}>
                  {relationshipLines.map((line) => {
                    const segments = line.split(/(\(available from [^)]*\):?|\(above 75\), or Charisma\/Persuasion roll 6 succeeds, or Deception\/Rizz roll 10 succeeds)/g).filter(Boolean);
                    return (
                      <Text key={line} style={styles.rollText}>
                        {segments.map((segment, index) => (
                          <Text
                            key={`${index}-${segment}`}
                            style={segment.startsWith("(available from ") || segment.startsWith("(above 75)") ? styles.gameHiddenText : styles.discoverableHiddenText}
                          >
                            {segment}
                          </Text>
                        ))}
                      </Text>
                    );
                  })}
                </View>
              ) : null}
              <View style={styles.mysteryDossierGrid}>
                {!npc.isChild && npc.substanceState !== "sober" ? (
                  <View style={styles.substanceBubbleRow}>
                    <Text style={styles.substanceBubble}>{titleCase(npc.substanceState)}</Text>
                    <Text style={styles.substanceBubble}>trust {npc.temporaryTrust >= 0 ? "+" : ""}{npc.temporaryTrust}</Text>
                    <Text style={styles.substanceBubble}>{npc.substanceTurns} turns</Text>
                  </View>
                ) : null}
                {!npc.isChild && mysterySubstanceLine(npc) ? <Text style={[styles.body, { color: npc.substanceState === "drunk" || npc.substanceState === "high" ? "#ff4d4d" : C.dim }]}>{mysterySubstanceLine(npc)}</Text> : null}
                {!npc.isChild ? <Text style={[styles.body, { color: C.text }]}>Family status: <Text style={styles.discoverableHiddenText}>{familyStatus}</Text></Text> : null}
                {!npc.isChild ? <Text style={[styles.body, { color: C.text }]}>Education: <Text style={styles.discoverableHiddenText}>{mysteryDisplayEducation(npc.education)}</Text></Text> : null}
                {!npc.isChild ? <Text style={[styles.body, { color: C.text }]}>Occupation: <Text style={styles.discoverableHiddenText}>{mysteryDisplayOccupation(npc)}</Text></Text> : null}
                <Text style={[styles.body, { color: C.text }]}>Reason of stay: <Text style={styles.discoverableHiddenText}>{mysteryDisplayReasonOfStay(npc, activeMystery)}</Text></Text>
                <Text style={[styles.body, { color: C.text }]}>Current stay: <Text style={styles.discoverableHiddenText}>{npc.currentStay ?? "Not recorded yet."}</Text></Text>
                {npc.role === "Guest" ? <Text style={[styles.body, { color: C.text }]}>Planned stay: <Text style={styles.discoverableHiddenText}>{npc.plannedStay ?? "Not recorded yet."}</Text></Text> : null}
                {npc.role === "Guest" ? <Text style={[styles.body, { color: C.text }]}>Previous stay: <Text style={styles.discoverableHiddenText}>{npc.previousStay ?? "Not recorded yet."}</Text></Text> : null}
                {mysteryResidentSecretLines(npc, activeMystery).map((secretLine, index) => (
                  <Text key={`${npc.id}-secret-${index}`} style={[styles.body, styles.discoverableHiddenText]}>Secret: {secretLine}</Text>
                ))}
                {!npc.isChild ? <Text style={[styles.body, { color: C.dim }]}>Substance preference: <Text style={styles.discoverableHiddenText}>{mysteryDisplaySubstancePreference(npc)}</Text></Text> : null}
                <Text style={[styles.body, { color: C.dim }]}>Current location: {mysteryRoomName(activeMystery, currentMysteryNpcRoomId(activeMystery, npc))}</Text>
                <Text style={[styles.body, { color: C.dim }]}>
                  {npc.role === "Guest" ? "Room" : "Station"}: <Text style={styles.discoverableHiddenText}>{mysteryRoomName(activeMystery, npc.role === "Guest" ? npc.roomId : npc.stationRoomId)}</Text>
                </Text>
              </View>
            </Pressable>
          );
        })}
        <Button label="Back" onPress={() => setScreen("mystery")} />
      </Shell>
    );
  }

  if (screen === "mysteryFamilyTree" && activeMystery) {
    const treeRootId = selectedMysteryTreeNpcId ?? focusedMysteryNpcId;
    const root = activeMystery.npcs.find((npc) => npc.id === treeRootId) ?? activeMystery.npcs[0];
    const familyMembers = root ? mysteryResidentFamilyMembers(activeMystery, root.id) : [];
    const familyMemberIds = new Set(familyMembers.map((npc) => npc.id));
    const { parentPairs, pairKey } = mysteryParentAndSiblingSets(activeMystery);
    const isParentOf = (parentId: string, childId: string) => parentPairs.some((pair) => pair.parentId === parentId && pair.childId === childId);
    const relationshipEdges = mysteryFamilyTreeEdges(activeMystery)
      .filter((link) => familyMemberIds.has(link.fromId) && familyMemberIds.has(link.toId))
      .filter((link, index, list) => list.findIndex((candidate) => pairKey(candidate.fromId, candidate.toId) === pairKey(link.fromId, link.toId) && candidate.kind === link.kind) === index);
    const generationById = new Map<string, number>();
    if (root) generationById.set(root.id, 0);
    const pendingGenerationIds = root ? [root.id] : [];
    while (pendingGenerationIds.length > 0) {
      const currentId = pendingGenerationIds.shift()!;
      const currentGeneration = generationById.get(currentId) ?? 0;
      const currentNpc = activeMystery.npcs.find((npc) => npc.id === currentId);
      if (!currentNpc) continue;
      for (const edge of relationshipEdges) {
        const otherId = edge.fromId === currentId ? edge.toId : edge.toId === currentId ? edge.fromId : null;
        if (!otherId || generationById.has(otherId)) continue;
        const otherNpc = activeMystery.npcs.find((npc) => npc.id === otherId);
        if (!otherNpc) continue;
        const graphDelta = edge.kind === "parentChild"
          ? isParentOf(currentId, otherId) ? 1 : -1
          : edge.kind === "auntUncleNibling"
            ? edge.fromId === currentId ? 1 : -1
            : 0;
        const labelDelta = mysteryTreeGenerationDeltaForRelationLabel(directMysteryTreeRelationshipLabel(currentNpc, otherNpc, activeMystery));
        const delta = edge.kind === "parentChild" || edge.kind === "auntUncleNibling" ? graphDelta : labelDelta ?? graphDelta;
        generationById.set(otherId, currentGeneration + delta);
        pendingGenerationIds.push(otherId);
      }
    }
    for (const npc of familyMembers) {
      if (generationById.has(npc.id) || !root) continue;
      const labelDelta = mysteryTreeGenerationDeltaForRelationLabel(mysteryTreeRelationshipLabel(root, npc, activeMystery));
      generationById.set(npc.id, labelDelta ?? (npc.age >= root.age + 16 ? -1 : npc.age <= root.age - 16 || npc.isChild ? 1 : 0));
    }
    const generations = Array.from(new Set(familyMembers.map((npc) => generationById.get(npc.id) ?? 0))).sort((a, b) => a - b);
    const nodeWidth = 118;
    const nodeHeight = 112;
    const nodeGapX = 64;
    const generationGapY = 112;
    const canvasPaddingX = 50;
    const canvasPaddingY = 86;
    const orderGenerationPeople = (people: MysteryNpc[]) => {
      const peopleIds = new Set(people.map((npc) => npc.id));
      const weightedNeighborScore = (npc: MysteryNpc) => relationshipEdges.reduce((score, edge) => {
        const touchesNpc = edge.fromId === npc.id || edge.toId === npc.id;
        if (!touchesNpc) return score;
        const otherId = edge.fromId === npc.id ? edge.toId : edge.fromId;
        if (!peopleIds.has(otherId)) return score;
        if (edge.kind === "spouse" || edge.kind === "partner" || edge.kind === "lover") return score + 80;
        if (edge.kind === "parentChild" || edge.kind === "auntUncleNibling") return score + 40;
        if (edge.kind === "sibling" || edge.kind === "cousin") return score + 20;
        return score + 5;
      }, 0);
      const baseSorted = [...people].sort((a, b) =>
        weightedNeighborScore(b) - weightedNeighborScore(a) ||
        b.age - a.age ||
        fullName(a).localeCompare(fullName(b))
      );
      const assigned = new Set<string>();
      const groups: MysteryNpc[][] = [];
      const strongestSameGenerationPartner = (npc: MysteryNpc) => {
        const partnerLinks = relationshipEdges
          .filter((edge) =>
            (edge.kind === "spouse" || edge.kind === "partner" || edge.kind === "lover") &&
            (edge.fromId === npc.id || edge.toId === npc.id)
          )
          .map((edge) => ({
            edge,
            other: activeMystery.npcs.find((candidate) => candidate.id === (edge.fromId === npc.id ? edge.toId : edge.fromId))
          }))
          .filter((entry): entry is { edge: MysteryFamilyTreeEdge; other: MysteryNpc } => Boolean(entry.other && peopleIds.has(entry.other.id) && !assigned.has(entry.other.id)));
        return partnerLinks
          .sort((a, b) =>
            (b.edge.kind === "spouse" ? 3 : b.edge.kind === "partner" ? 2 : 1) -
            (a.edge.kind === "spouse" ? 3 : a.edge.kind === "partner" ? 2 : 1) ||
            weightedNeighborScore(b.other) - weightedNeighborScore(a.other)
          )[0]?.other;
      };
      for (const npc of baseSorted) {
        if (assigned.has(npc.id)) continue;
        assigned.add(npc.id);
        const partner = strongestSameGenerationPartner(npc);
        if (partner) {
          assigned.add(partner.id);
          groups.push(npc.id === root?.id ? [partner, npc] : [npc, partner]);
        } else {
          groups.push([npc]);
        }
      }
      const scoreGroup = (group: MysteryNpc[]) => group.reduce((score, npc) => score + weightedNeighborScore(npc), 0);
      const sortedGroups = groups.sort((a, b) =>
        Number(b.some((npc) => npc.id === root?.id)) - Number(a.some((npc) => npc.id === root?.id)) ||
        scoreGroup(b) - scoreGroup(a) ||
        Math.max(...b.map((npc) => npc.age)) - Math.max(...a.map((npc) => npc.age))
      );
      if (!root || !sortedGroups.some((group) => group.some((npc) => npc.id === root.id))) return sortedGroups.flat();
      const rootGroup = sortedGroups.find((group) => group.some((npc) => npc.id === root.id)) ?? [root];
      const otherGroups = sortedGroups.filter((group) => !group.some((npc) => npc.id === root.id));
      const leftGroups: MysteryNpc[][] = [];
      const rightGroups: MysteryNpc[][] = [];
      otherGroups.forEach((group, index) => {
        (index % 2 === 0 ? rightGroups : leftGroups).push(group);
      });
      const ordered = [...leftGroups.reverse().flat(), ...rootGroup, ...rightGroups.flat()];
      if (!root || !peopleIds.has(root.id)) return ordered;
      const sameGenerationPartner = (npcId: string, kinds: MysteryFamilyTreeEdgeKind[]) => relationshipEdges
        .filter((edge) => kinds.includes(edge.kind) && (edge.fromId === npcId || edge.toId === npcId))
        .map((edge) => activeMystery.npcs.find((candidate) => candidate.id === (edge.fromId === npcId ? edge.toId : edge.fromId)))
        .find((candidate): candidate is MysteryNpc => Boolean(candidate && peopleIds.has(candidate.id)));
      const rootSpouse = sameGenerationPartner(root.id, ["spouse", "partner"]);
      const rootLover = sameGenerationPartner(root.id, ["lover"]);
      const spousesLover = rootSpouse ? sameGenerationPartner(rootSpouse.id, ["lover"]) : undefined;
      const loversLover = rootLover ? sameGenerationPartner(rootLover.id, ["lover", "spouse", "partner"]) : undefined;
      const chain = rootLover && loversLover && loversLover.id !== root.id
        ? [root, rootLover, loversLover]
        : rootSpouse && rootLover
        ? [rootSpouse, root, rootLover]
        : rootSpouse && spousesLover && spousesLover.id !== root.id
          ? [root, rootSpouse, spousesLover]
          : null;
      if (!chain) return ordered;
      const chainIds = new Set(chain.map((npc) => npc.id));
      const remaining = ordered.filter((npc) => !chainIds.has(npc.id));
      const rootIndex = ordered.findIndex((npc) => npc.id === root.id);
      const leftCount = Math.max(0, Math.min(remaining.length, rootIndex - chain.findIndex((npc) => npc.id === root.id)));
      return [...remaining.slice(0, leftCount), ...chain, ...remaining.slice(leftCount)];
    };
    const generationRows = generations.map((generation) => ({
      generation,
      people: orderGenerationPeople(familyMembers.filter((npc) => (generationById.get(npc.id) ?? 0) === generation))
    }));
    const maxRowCount = Math.max(1, ...generationRows.map((row) => row.people.length));
    const treeCanvasWidth = Math.max(620, canvasPaddingX * 2 + maxRowCount * nodeWidth + Math.max(0, maxRowCount - 1) * nodeGapX);
    const treeCanvasHeight = Math.max(390, canvasPaddingY * 2 + generationRows.length * nodeHeight + Math.max(0, generationRows.length - 1) * generationGapY + 70);
    const nodeLayout = new Map<string, { x: number; y: number; centerX: number; centerY: number; generation: number }>();
    generationRows.forEach((row, rowIndex) => {
      const rowWidth = row.people.length * nodeWidth + Math.max(0, row.people.length - 1) * nodeGapX;
      const startX = (treeCanvasWidth - rowWidth) / 2;
      const y = canvasPaddingY + rowIndex * (nodeHeight + generationGapY);
      const entries = row.people.map((npc, index) => {
        const parentEdges = relationshipEdges
          .filter((edge) => edge.kind === "parentChild" && edge.toId === npc.id)
          .map((edge) => nodeLayout.get(edge.fromId))
          .filter((layout): layout is { x: number; y: number; centerX: number; centerY: number; generation: number } => Boolean(layout && layout.generation < row.generation));
        const preferredCenter = parentEdges.length > 0
          ? parentEdges.reduce((sum, layout) => sum + layout.centerX, 0) / parentEdges.length
          : null;
        return {
          npc,
          baseCenter: startX + index * (nodeWidth + nodeGapX) + nodeWidth / 2,
          preferredCenter
        };
      });
      if (entries.some((entry) => entry.preferredCenter !== null)) {
        entries.sort((a, b) =>
          (a.preferredCenter ?? a.baseCenter) - (b.preferredCenter ?? b.baseCenter) ||
          a.baseCenter - b.baseCenter
        );
      }
      let nextX = canvasPaddingX;
      const placed = entries.map((entry) => {
        const preferredX = (entry.preferredCenter ?? entry.baseCenter) - nodeWidth / 2;
        const x = Math.max(nextX, Math.min(treeCanvasWidth - canvasPaddingX - nodeWidth, preferredX));
        nextX = x + nodeWidth + nodeGapX;
        return { npc: entry.npc, x };
      });
      const overflow = Math.max(0, nextX - nodeGapX - (treeCanvasWidth - canvasPaddingX));
      placed.forEach(({ npc, x }) => {
        const adjustedX = Math.max(canvasPaddingX, x - overflow);
        nodeLayout.set(npc.id, { x: adjustedX, y, centerX: adjustedX + nodeWidth / 2, centerY: y + nodeHeight / 2, generation: row.generation });
      });
    });
    const selectedTreeLayout = root ? nodeLayout.get(root.id) : null;
    mysteryTreeSelectedCenterRef.current = selectedTreeLayout
      ? { x: selectedTreeLayout.centerX, y: selectedTreeLayout.centerY, canvasWidth: treeCanvasWidth, canvasHeight: treeCanvasHeight }
      : null;
    const treeTone = themeName === "dark"
      ? {
        frame: "#9d7540",
        shellBg: "#10272d",
        headerBg: "rgba(10, 28, 33, 0.88)",
        headerText: "#f5e3c8",
        nodeBg: "transparent",
        nodeBorder: "transparent",
        nodeText: "#f8ead0",
        familyLine: "#d88932",
        loverLine: "#d43b35",
        partnerLine: "#9a62e8"
      }
      : {
        frame: "#d1a65d",
        shellBg: "#a9d3d8",
        headerBg: "rgba(232, 250, 251, 0.9)",
        headerText: "#4b493b",
        nodeBg: "transparent",
        nodeBorder: "transparent",
        nodeText: "#27343a",
        familyLine: "#c9772c",
        loverLine: "#c93434",
        partnerLine: "#8d55d8"
      };
    const lineColorFor = (kind: MysteryFamilyTreeEdgeKind) => kind === "lover" ? treeTone.loverLine : kind === "partner" || kind === "spouse" ? treeTone.partnerLine : treeTone.familyLine;
    const lineWidthFor = (_kind: MysteryFamilyTreeEdgeKind) => 3;
    const LineSegment = ({ x, y, width, height, color }: { x: number; y: number; width: number; height: number; color: string }) => (
      <View pointerEvents="none" style={[styles.mysteryFamilyTreeLineSegment, { left: x, top: y, width: Math.max(2, width), height: Math.max(2, height), backgroundColor: color }]} />
    );
    const treeHorizontal = (x1: number, x2: number, y: number, color: string, thickness: number, key: string) => (
      <LineSegment key={key} x={Math.min(x1, x2)} y={y - thickness / 2} width={Math.abs(x2 - x1)} height={thickness} color={color} />
    );
    const treeVertical = (x: number, y1: number, y2: number, color: string, thickness: number, key: string) => (
      <LineSegment key={key} x={x - thickness / 2} y={Math.min(y1, y2)} width={thickness} height={Math.abs(y2 - y1)} color={color} />
    );
    const parentChildRailKeys = new Set<string>();
    const parentChildRailSegments = (() => {
      const parentChildEdges = relationshipEdges.filter((candidate) => candidate.kind === "parentChild");
      const parentIdsByChild = new Map<string, string[]>();
      for (const edge of parentChildEdges) {
        const parent = nodeLayout.get(edge.fromId);
        const child = nodeLayout.get(edge.toId);
        if (!parent || !child || parent.generation >= child.generation) continue;
        parentIdsByChild.set(edge.toId, [...(parentIdsByChild.get(edge.toId) ?? []), edge.fromId]);
      }

      const sharedParentChildEdgeKeys = new Set<string>();
      const childIdsByParentSet = new Map<string, string[]>();
      for (const [childId, parentIds] of parentIdsByChild) {
        const uniqueParentIds = Array.from(new Set(parentIds));
        if (uniqueParentIds.length < 2) continue;
        const parentKey = uniqueParentIds.sort().join(":");
        childIdsByParentSet.set(parentKey, [...(childIdsByParentSet.get(parentKey) ?? []), childId]);
        for (const parentId of uniqueParentIds) {
          sharedParentChildEdgeKeys.add(`parent-child-${parentId}-${childId}`);
        }
      }

      const sharedParentSegments = Array.from(childIdsByParentSet.entries()).flatMap(([parentKey, childIds]) => {
        const parentIds = parentKey.split(":");
        const parents = parentIds
          .map((parentId) => ({ parentId, layout: nodeLayout.get(parentId) }))
          .filter((entry): entry is { parentId: string; layout: { x: number; y: number; centerX: number; centerY: number; generation: number } } => Boolean(entry.layout))
          .sort((a, b) => a.layout.centerX - b.layout.centerX);
        const children = childIds
          .map((childId) => ({ childId, layout: nodeLayout.get(childId) }))
          .filter((entry): entry is { childId: string; layout: { x: number; y: number; centerX: number; centerY: number; generation: number } } => Boolean(entry.layout))
          .sort((a, b) => a.layout.centerX - b.layout.centerX);
        if (parents.length < 2 || children.length === 0) return [];

        for (const child of children) {
          for (const parent of parents) {
            parentChildRailKeys.add(`parent-child-${parent.parentId}-${child.childId}`);
          }
        }

        const thickness = lineWidthFor("parentChild");
        const parentBottomY = Math.max(...parents.map((parent) => parent.layout.y + nodeHeight));
        const childTopY = Math.min(...children.map((child) => child.layout.y));
        const railY = parentBottomY + Math.max(24, Math.min(62, (childTopY - parentBottomY) * 0.5));
        const railXs = [...parents.map((parent) => parent.layout.centerX), ...children.map((child) => child.layout.centerX)];
        const keyBase = `shared-parent-child-rail-${parentKey}-${childIds.join("-")}`;
        return [
          treeHorizontal(Math.min(...railXs), Math.max(...railXs), railY, treeTone.familyLine, thickness, `${keyBase}-horizontal`),
          ...parents.map((parent) => treeVertical(parent.layout.centerX, parent.layout.y + nodeHeight, railY, treeTone.familyLine, thickness, `${keyBase}-parent-${parent.parentId}`)),
          ...children.map((child) => treeVertical(child.layout.centerX, railY, child.layout.y, treeTone.familyLine, thickness, `${keyBase}-child-${child.childId}`))
        ];
      });

      const childIdsByParent = new Map<string, string[]>();
      for (const edge of parentChildEdges) {
        if (sharedParentChildEdgeKeys.has(edge.id)) continue;
        childIdsByParent.set(edge.fromId, [...(childIdsByParent.get(edge.fromId) ?? []), edge.toId]);
      }
      const singleParentSegments = Array.from(childIdsByParent.entries()).flatMap(([parentId, childIds]) => {
        const parent = nodeLayout.get(parentId);
        const children = childIds
          .map((childId) => ({ childId, layout: nodeLayout.get(childId) }))
          .filter((entry): entry is { childId: string; layout: { x: number; y: number; centerX: number; centerY: number; generation: number } } => Boolean(entry.layout))
          .filter((entry) => parent ? entry.layout.generation > parent.generation : false)
          .sort((a, b) => a.layout.centerX - b.layout.centerX);
        if (!parent || children.length === 0) return [];

        children.forEach((child) => parentChildRailKeys.add(`parent-child-${parentId}-${child.childId}`));
        const thickness = lineWidthFor("parentChild");
        const childTopY = Math.min(...children.map((child) => child.layout.y));
        const railY = parent.y + nodeHeight + Math.max(24, Math.min(62, (childTopY - (parent.y + nodeHeight)) * 0.5));
        const railXs = [parent.centerX, ...children.map((child) => child.layout.centerX)];
        const minRailX = Math.min(...railXs);
        const maxRailX = Math.max(...railXs);
        const keyBase = `parent-child-rail-${parentId}-${children.map((child) => child.childId).join("-")}`;
        return [
          treeVertical(parent.centerX, parent.y + nodeHeight, railY, treeTone.familyLine, thickness, `${keyBase}-parent`),
          ...(minRailX !== maxRailX ? [treeHorizontal(minRailX, maxRailX, railY, treeTone.familyLine, thickness, `${keyBase}-rail`)] : []),
          ...children.map((child) => treeVertical(child.layout.centerX, railY, child.layout.y, treeTone.familyLine, thickness, `${keyBase}-child-${child.childId}`))
        ];
      });
      return [...sharedParentSegments, ...singleParentSegments];
    })();
    const sameGenerationFamilyRailSegments = (() => {
      const visibleParentIdsByChild = new Map<string, string[]>();
      for (const edge of relationshipEdges.filter((candidate) => candidate.kind === "parentChild")) {
        visibleParentIdsByChild.set(edge.toId, [...(visibleParentIdsByChild.get(edge.toId) ?? []), edge.fromId]);
      }
      const siblingsShareVisibleParent = (leftId: string, rightId: string) => {
        const leftParents = visibleParentIdsByChild.get(leftId) ?? [];
        const rightParents = visibleParentIdsByChild.get(rightId) ?? [];
        return leftParents.some((parentId) => rightParents.includes(parentId));
      };
      const sameGenerationFamilyEdges = relationshipEdges.filter((edge) => {
        if (edge.kind !== "sibling" && edge.kind !== "cousin") return false;
        if (edge.kind === "sibling" && siblingsShareVisibleParent(edge.fromId, edge.toId)) return false;
        const from = nodeLayout.get(edge.fromId);
        const to = nodeLayout.get(edge.toId);
        return Boolean(from && to && from.generation === to.generation);
      });
      const groups: string[][] = [];
      for (const edge of sameGenerationFamilyEdges) {
        const leftGroup = groups.find((group) => group.includes(edge.fromId));
        const rightGroup = groups.find((group) => group.includes(edge.toId));
        if (leftGroup && rightGroup && leftGroup !== rightGroup) {
          leftGroup.push(...rightGroup);
          groups.splice(groups.indexOf(rightGroup), 1);
        } else if (leftGroup) {
          leftGroup.push(edge.toId);
        } else if (rightGroup) {
          rightGroup.push(edge.fromId);
        } else {
          groups.push([edge.fromId, edge.toId]);
        }
      }
      return groups.flatMap((group) => {
        const uniqueIds = Array.from(new Set(group));
        const layouts = uniqueIds
          .map((id) => nodeLayout.get(id))
          .filter((layout): layout is { x: number; y: number; centerX: number; centerY: number; generation: number } => Boolean(layout))
          .sort((a, b) => a.centerX - b.centerX);
        if (layouts.length < 2) return [];
        const generation = layouts[0].generation;
        const thickness = lineWidthFor("sibling");
        const rowLayouts = familyMembers
          .map((npc) => nodeLayout.get(npc.id))
          .filter((layout): layout is { x: number; y: number; centerX: number; centerY: number; generation: number } => Boolean(layout && layout.generation === generation));
        const railY = Math.max(18, Math.min(...rowLayouts.map((layout) => layout.y)) - 34);
        const minX = layouts[0].centerX;
        const maxX = layouts[layouts.length - 1].centerX;
        const keyBase = `same-generation-family-rail-${generation}-${uniqueIds.sort().join("-")}`;
        return [
          treeHorizontal(minX, maxX, railY, treeTone.familyLine, thickness, `${keyBase}-horizontal`),
          ...layouts.map((layout, index) => treeVertical(layout.centerX, railY, layout.y, treeTone.familyLine, thickness, `${keyBase}-drop-${index}`))
        ];
      });
    })();
    const edgeSegments = relationshipEdges.flatMap((edge) => {
      const from = nodeLayout.get(edge.fromId);
      const to = nodeLayout.get(edge.toId);
      if (!from || !to) return [];
      const fromNpc = activeMystery.npcs.find((npc) => npc.id === edge.fromId);
      const toNpc = activeMystery.npcs.find((npc) => npc.id === edge.toId);
      const color = lineColorFor(edge.kind);
      const thickness = lineWidthFor(edge.kind);
      if (edge.kind === "parentChild" && parentChildRailKeys.has(edge.id)) return [];
      if (from.generation === to.generation) {
        if (edge.kind === "sibling" || edge.kind === "cousin") return [];
        if (edge.kind === "spouse" || edge.kind === "partner" || edge.kind === "lover") {
          const left = from.centerX <= to.centerX ? from : to;
          const right = from.centerX <= to.centerX ? to : from;
          return [treeHorizontal(left.x + nodeWidth - 5, right.x + 5, left.centerY - 8, color, thickness, `${edge.id}-same-direct`)];
        }
        const sameLevelLabel = fromNpc && toNpc ? directMysteryTreeRelationshipLabel(fromNpc, toNpc, activeMystery) : "";
        const routeAbove = Boolean(sameLevelLabel?.match(/\b(sister|brother|cousin)\b/));
        const routeBelow = !routeAbove && from.y < treeCanvasHeight - nodeHeight - 90;
        const routeY = routeBelow ? from.y + nodeHeight + 22 : from.y - 22;
        const fromAnchorY = routeBelow ? from.y + nodeHeight : from.y;
        const toAnchorY = routeBelow ? to.y + nodeHeight : to.y;
        return [
          treeVertical(from.centerX, fromAnchorY, routeY, color, thickness, `${edge.id}-same-from`),
          treeHorizontal(from.centerX, to.centerX, routeY, color, thickness, `${edge.id}-same-mid`),
          treeVertical(to.centerX, toAnchorY, routeY, color, thickness, `${edge.id}-same-to`)
        ];
      }
      const fromLower = from.y < to.y;
      const fromAnchorY = fromLower ? from.y + nodeHeight : from.y;
      const toAnchorY = fromLower ? to.y : to.y + nodeHeight;
      const routeY = (fromAnchorY + toAnchorY) / 2;
      return [
        treeVertical(from.centerX, fromAnchorY, routeY, color, thickness, `${edge.id}-from`),
        treeHorizontal(from.centerX, to.centerX, routeY, color, thickness, `${edge.id}-mid`),
        treeVertical(to.centerX, toAnchorY, routeY, color, thickness, `${edge.id}-to`)
      ];
    });

    return (
      <Shell>
        <View style={styles.rowBetween}>
          <Text style={[styles.titleSmall, { color: C.text }]}>Family Tree</Text>
          <Button small label="Residents" onPress={() => setScreen("mysteryRelations")} />
        </View>
        <View style={[styles.mysteryFamilyTreeShell, { backgroundColor: treeTone.shellBg, borderColor: treeTone.frame }]}>
          <View style={[styles.mysteryFamilyTreeTitleBar, { backgroundColor: treeTone.headerBg, borderBottomColor: treeTone.frame }]}>
            <Text style={[styles.mysteryFamilyTreeTitle, { color: treeTone.headerText }]}>{root ? `Family Tree of ${fullName(root)}` : "Family Tree"}</Text>
          </View>
          <ScrollView
            ref={mysteryTreeHorizontalRef}
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator
            style={styles.mysteryFamilyTreeViewport}
            onLayout={(event) => {
              const { width, height } = event.nativeEvent.layout;
              setMysteryTreeViewport((current) => current.width === width && current.height === height ? current : { width, height });
            }}
          >
            <ScrollView ref={mysteryTreeVerticalRef} nestedScrollEnabled showsVerticalScrollIndicator>
              <View style={[styles.mysteryFamilyTreeCanvas, { width: treeCanvasWidth, height: treeCanvasHeight }]}>
                <View pointerEvents="none" style={styles.mysteryFamilyTreeLineLayer}>
                  {parentChildRailSegments}
                  {sameGenerationFamilyRailSegments}
                  {edgeSegments}
                </View>
                {familyMembers.map((npc) => {
                  const selected = root?.id === npc.id;
                  const relationLabel = root ? mysteryTreeRelationshipLabel(root, npc, activeMystery) : "";
                  const hasRelationLabel = relationLabel.length > 0;
                  const layout = nodeLayout.get(npc.id);
                  if (!layout) return null;
                  return (
                    <Pressable
                      key={npc.id}
                      onPress={() => pressMysteryFamilyTreeNode(npc.id)}
                      style={[
                        styles.mysteryFamilyTreeNode,
                        { left: layout.x, top: layout.y, backgroundColor: treeTone.nodeBg, borderColor: treeTone.nodeBorder },
                        !hasRelationLabel && styles.mysteryFamilyTreeNodeNoText,
                        selected && [styles.mysteryFamilyTreeNodeSelected, { borderColor: C.gold, shadowColor: C.gold }]
                      ]}
                    >
                      <PortraitImage subject={npc} size="tree" highlight={selected} />
                      {hasRelationLabel ? (
                        <View style={styles.mysteryFamilyTreeNodeText}>
                          <Text style={[styles.mysteryFamilyTreeNodeName, { color: treeTone.nodeText }]} numberOfLines={1}>{relationLabel}</Text>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </ScrollView>
        </View>
        <Button label="Back" onPress={() => setScreen("mysteryRelations")} />
      </Shell>
    );
  }

  if (screen === "mysteryMap" && activeMystery) {
    const mapRooms = mysteryRoomsInCanonicalOrder(activeMystery.rooms);
    const visibleFloors = [1, 2, 3].filter((floor) => mapRooms.some((room) => room.floor === floor));
    return (
      <Shell>
        <View style={styles.rowBetween}>
          <Text style={[styles.titleSmall, { color: C.text }]}>Mansion Map</Text>
          <Button small label="Back" onPress={() => setScreen("mystery")} />
        </View>
        {visibleFloors.map((floor) => (
          <Card key={floor}>
            <Text style={[styles.heading, { color: C.text }]}>Floor {floor}</Text>
            <View style={styles.mysteryMapGrid}>
              {mapRooms.filter((room) => room.floor === floor).map((room, roomIndex) => {
                const isCurrentRoom = activeMystery.currentRoomId === room.id;
                const visibleToPlayer = room.accessible || room.kind === "public" || room.id === activeMystery.playerRoomId;
                const playerInsideFoggedRoom = isCurrentRoom && !visibleToPlayer;
                const people = visibleToPlayer ? mysteryPeopleInRoom(activeMystery, room.id) : [];
                const fogSource = ravenwoodFogLayers[roomIndex % ravenwoodFogLayers.length];
                const fogOpacity = mapFogMotion.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: roomIndex % 2 === 0 ? [0.5, 0.72, 0.58] : [0.66, 0.48, 0.7]
                });
                const fogScale = mapFogMotion.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: roomIndex % 2 === 0 ? [1.12, 1.2, 1.15] : [1.18, 1.1, 1.22]
                });
                const fogTranslateX = mapFogMotion.interpolate({
                  inputRange: [0, 1],
                  outputRange: roomIndex % 2 === 0 ? [-8, 8] : [7, -7]
                });
                const fogTranslateY = mapFogMotion.interpolate({
                  inputRange: [0, 1],
                  outputRange: roomIndex % 3 === 0 ? [4, -6] : [-5, 5]
                });
                return (
                  <Pressable
                    key={room.id}
                    disabled={activeMystery.finished}
                    onPress={() => visibleToPlayer ? visitMysteryRoom(room.id) : standAtMysteryClosedDoor(room.id)}
                    style={[styles.mysteryRoomTile, { borderColor: isCurrentRoom ? C.accent : visibleToPlayer ? C.gold : C.line, backgroundColor: visibleToPlayer ? C.panel2 : "rgba(100, 100, 105, 0.15)" }]}
                  >
                    {!visibleToPlayer ? (
                      <Animated.View
                        pointerEvents="none"
                        style={[
                          styles.mapFogOverlay,
                          {
                            opacity: fogOpacity,
                            transform: [{ translateX: fogTranslateX }, { translateY: fogTranslateY }, { scale: fogScale }]
                          }
                        ]}
                      >
                        <Image source={fogSource} resizeMode="cover" style={styles.mapFogImage} />
                      </Animated.View>
                    ) : null}
                    <View style={styles.mysteryMapRoomContent}>
                      <Text style={[styles.mysteryRoomName, { color: C.text }]}>{room.name}</Text>
                      {room.bedSetup && visibleToPlayer ? <Text style={[styles.rollText, { color: C.dim }]}>{titleCase(room.bedSetup)}</Text> : null}
                      <Text style={[styles.rollText, { color: isCurrentRoom ? C.accent : visibleToPlayer ? C.good : C.dim }]}>{isCurrentRoom ? "You are here" : visibleToPlayer ? "Accessible" : "Unknown"}</Text>
                      {playerInsideFoggedRoom ? (
                        <View style={styles.mapPlayerInFogRow}>
                          <Pressable onPress={() => setScreen("mysteryCharacter")} style={styles.mapPlayerInFogButton}>
                            <PortraitImage subject={mysteryPlayerPortraitSubject(activeMystery.player)} size="map" highlight />
                          </Pressable>
                        </View>
                      ) : null}
                      <View style={styles.row}>
                        {people.slice(0, 5).map((person) => (
                          <Pressable key={person.id} onPress={() => focusMysteryNpc(person.id)} style={styles.mapPortraitButton}>
                            <PortraitImage subject={person} size="map" />
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        ))}
        <Button label="Back" onPress={() => setScreen("mystery")} />
      </Shell>
    );
  }

  if (screen === "mysteryJournal" && activeMystery) {
    const archiveSource = activeMystery.finished ? [...activeMystery.journal, ...activeMystery.messages] : activeMystery.journal;
    const archiveMessagesByDay = archiveSource.reduce<
      Record<number, StoryMessage[]>
    >((groups, message) => {
      const day = message.archiveDay ?? 1;

      if (!groups[day]) {
        groups[day] = [];
      }

      groups[day].push(message);
      return groups;
    }, {});

    const archiveDays = Object.keys(archiveMessagesByDay)
      .map(Number)
      .sort((a, b) => b - a);

    const isClosedCaseReport = activeMystery.finished;
    const happenedMurders = activeMystery.murders.filter((murder) => mysteryMurderTookPlace(activeMystery, murder) || murder.discovered || murder.solved);
    const preventedMurders = activeMystery.murders.filter((murder) => murder.prevented);
    const solvedMurders = activeMystery.murders.filter((murder) => murder.solved);
    const closedCaseMedals = mysteryMedalIdsForFinishedGame(activeMystery)
      .map((medalId) => mysteryMedalDefinitions.find((definition) => definition.id === medalId)?.title)
      .filter(Boolean) as string[];
    const collectedProofItems = activeMystery.findables
      .filter((findable) => findable.kind === "Proof" && (findable.collected || activeMystery.discoveredProof.includes(findable.proofText ?? findable.description)))
      .map((findable) => mysteryPlayerFacingFindableName(findable));
    const livingLoveInterest = activeMystery.npcs.find((npc) => npc.alive && npc.romance >= 65 && mysteryCanPlayerHaveRomanceWithNpc(activeMystery.player, npc));
    const lostLoveInterest = activeMystery.npcs.find((npc) => !npc.alive && npc.romance >= 65 && mysteryCanPlayerHaveRomanceWithNpc(activeMystery.player, npc));
    const closedCaseStats = [
      { label: "Outcome", value: activeMystery.won ? "Solved" : "Unsolved" },
      { label: "Murders", value: String(happenedMurders.length) },
      { label: "Solved", value: String(solvedMurders.length) },
      { label: "Lives Saved", value: String(preventedMurders.length) },
      { label: "Evidence", value: String(collectedProofItems.length) },
      { label: "Medals", value: String(closedCaseMedals.length) }
    ];

    const murderDetails = activeMystery.murders.map((murder, index) => {
      const proofItems = activeMystery.findables
        .filter((findable) => findable.kind === "Proof" && findable.relatedMurderIndex === index)
        .map((findable) => findable.name);
      const witness = murder.witnessId ? activeMystery.npcs.find((npc) => npc.id === murder.witnessId) : undefined;
      const details = [
        `${mysteryNpcName(activeMystery, murder.victimId)} killed by ${mysteryNpcName(activeMystery, murder.killerId)}`,
        `Day ${murder.day} ${murder.daytime}`,
        mysteryRoomName(activeMystery, murder.roomId),
        murder.alternateRoomId ? `fallback ${mysteryRoomName(activeMystery, murder.alternateRoomId)}` : "",
        murder.method,
        `motive: ${cleanSentenceEnd(murder.motive)}`,
        proofItems.length > 0 ? `proof: ${proofItems.join(" | ")}` : "",
        witness ? `witness: ${fullName(witness)}` : ""
      ].filter(Boolean);

      return `Murder ${index + 1}: ${details.join("; ")}.`;
    });

    return Shell({
      children: (
        <>
        <View style={styles.rowBetween}>
          <Text style={[styles.titleSmall, { color: C.text }]}>{isClosedCaseReport ? "Closed Case Report" : "Journal"}</Text>
          <Button small label="Back" onPress={() => setScreen(activeMystery.finished ? mysteryJournalBackScreen : "mystery")} />
        </View>
        {isClosedCaseReport ? (
          <>
            <View style={[styles.closedReportHero, { backgroundColor: C.panel, borderColor: activeMystery.won ? C.gold : C.warning }]}>
              <Text style={[styles.label, { color: activeMystery.won ? C.gold : C.warning }]}>{activeMystery.won ? "Case Closed" : "Case Lost"}</Text>
              <Text style={[styles.heading, styles.closedReportHeroTitle, { color: C.text }]}>{activeMystery.title}</Text>
              <Text style={[styles.body, { color: C.text }]}>{activeMystery.summary ?? (activeMystery.won ? "The case was solved." : "The case ended unsolved.")}</Text>
            </View>
            <View style={styles.closedReportStatGrid}>
              {closedCaseStats.map((stat) => (
                <View key={stat.label} style={[styles.closedReportStatBox, { backgroundColor: C.panel, borderColor: C.line }]}>
                  <Text style={[styles.closedReportStatValue, { color: C.text }]}>{stat.value}</Text>
                  <Text style={[styles.closedReportStatLabel, { color: C.dim }]}>{stat.label}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.heading, { color: C.text }]}>At a Glance</Text>
            {Card({
              children: (
                <>
                  <Text style={[styles.body, { color: C.text }]}>Detective: {activeMystery.player.firstName} {activeMystery.player.familyName}</Text>
                  <Text style={[styles.body, { color: C.text }]}>Final time: Day {activeMystery.day} {activeMystery.daytime}</Text>
                  <Text style={[styles.body, { color: C.text }]}>Saved residents: {preventedMurders.length > 0 ? preventedMurders.map((murder) => mysteryNpcName(activeMystery, murder.victimId)).join(", ") : "None"}</Text>
                  <Text style={[styles.body, { color: C.text }]}>Love story: {livingLoveInterest ? `${fullName(livingLoveInterest)} survived.` : lostLoveInterest ? `${fullName(lostLoveInterest)} was lost.` : "None recorded."}</Text>
                  <Text style={[styles.body, { color: C.text }]}>Medals won: {closedCaseMedals.length > 0 ? closedCaseMedals.join(", ") : "None"}</Text>
                </>
              )
            })}
            <Text style={[styles.heading, { color: C.text }]}>Murders</Text>
            {activeMystery.murders.map((murder, index) => {
              const proofItems = activeMystery.findables
                .filter((findable) => findable.kind === "Proof" && findable.relatedMurderIndex === index)
                .map((findable) => mysteryPlayerFacingFindableName(findable));
              const witness = murder.witnessId ? activeMystery.npcs.find((npc) => npc.id === murder.witnessId) : undefined;
              const status = murder.prevented ? "Prevented" : murder.solved ? "Solved" : mysteryMurderTookPlace(activeMystery, murder) ? "Occurred" : "Planned";
              return (
                <Card key={`closed-murder-${index}`}>
                  <View style={styles.rowBetween}>
                    <Text style={[styles.heading, { color: C.text }]}>Murder {index + 1}</Text>
                    <Text style={[styles.rollText, { color: murder.prevented ? C.good : murder.solved ? C.gold : C.warning }]}>{status}</Text>
                  </View>
                  <Text style={[styles.body, { color: C.text }]}>Victim: {mysteryNpcName(activeMystery, murder.victimId)}</Text>
                  <Text style={[styles.body, { color: C.text }]}>Killer: {mysteryNpcName(activeMystery, murder.killerId)}</Text>
                  <Text style={[styles.body, { color: C.text }]}>Time and place: Day {murder.day} {murder.daytime}, {mysteryRoomName(activeMystery, murder.roomId)}</Text>
                  <Text style={[styles.body, { color: C.text }]}>Method: {cleanSentenceEnd(murder.method)}</Text>
                  <Text style={[styles.body, { color: C.text }]}>Motive: {cleanSentenceEnd(murder.motive)}</Text>
                  <Text style={[styles.body, { color: C.text }]}>Proof: {proofItems.length > 0 ? proofItems.join(", ") : "No proof item recorded."}</Text>
                  <Text style={[styles.body, { color: C.text }]}>Witness: {witness ? fullName(witness) : "None recorded"}</Text>
                </Card>
              );
            })}
            <Text style={[styles.heading, { color: C.text }]}>Evidence Collected</Text>
            {Card({
              children: collectedProofItems.length > 0 ? (
                <>
                  {collectedProofItems.map((item) => (
                    <Text key={item} style={[styles.body, { color: C.text }]}>{item}</Text>
                  ))}
                </>
              ) : (
                <Text style={[styles.body, { color: C.dim }]}>No proof items collected.</Text>
              )
            })}
          </>
        ) : (
          <>
            {Card({
              children: (
                <>
                  <Text style={[styles.heading, { color: C.text }]}>
                    Your Notes
                  </Text>

                  <TextInput
                    value={activeMystery.journalNotes}
                    onChangeText={(journalNotes) =>
                      patchMystery((mystery) => ({
                        ...mystery,
                        journalNotes: journalNotes.slice(0, 3000)
                      }))
                    }
                    placeholder="Write your own suspicions, clues, and theories..."
                    placeholderTextColor={C.dim}
                    multiline
                    maxLength={3000}
                    style={[
                      styles.input,
                      styles.notesInput,
                      {
                        backgroundColor: C.panel2,
                        borderColor: C.line,
                        color: C.text
                      }
                    ]}
                  />
                </>
              )
            })}
            {Card({
              children: (
                <>
                  <Text style={[styles.heading, styles.gameHiddenText]}>
                    Murder Details
                  </Text>
                  {murderDetails.map((line) => (
                    <Text key={line} style={[styles.body, styles.gameHiddenText]}>
                      {line}
                    </Text>
                  ))}
                </>
              )
            })}
          </>
        )}
        <Text style={[styles.heading, { color: C.text }]}>
          {isClosedCaseReport ? "Original Journal Text" : "Story Archive"}
        </Text>

        {archiveSource.length === 0 ? (
          <Text style={[styles.subtitle, { color: C.dim }]}>
            Older story text will appear here after more than five responses.
          </Text>
        ) : null}

        {archiveDays.map((day) => {
          const isExpanded =
            expandedMysteryArchiveDays[day] ??
            day === archiveDays[0];

          const dayMessages = archiveMessagesByDay[day];

          return (
            <View key={`archive-day-${day}`}>
              <Pressable
                onPress={() =>
                  setExpandedMysteryArchiveDays((current) => ({
                    ...current,
                    [day]: !(current[day] ?? day === archiveDays[0])
                  }))
                }
                style={[
                  styles.mysteryArchiveDayHeader,
                  {
                    backgroundColor: C.panel2,
                    borderColor: C.line
                  }
                ]}
              >
                <View>
                  <Text style={[styles.heading, { color: C.text }]}>
                    Day {day}
                  </Text>

                  <Text style={[styles.rollText, { color: C.dim }]}>
                    {dayMessages.length} archived{" "}
                    {dayMessages.length === 1 ? "entry" : "entries"}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.mysteryArchiveArrow,
                    { color: C.accent }
                  ]}
                >
                  {isExpanded ? "â–˛" : "â–Ľ"}
                </Text>
              </Pressable>

              {isExpanded
                ? dayMessages.map((message) => (
                    <Card key={message.id}>
                      <View style={styles.rowBetween}>
                        <Text
                          style={[
                            styles.storySpeaker,
                            {
                              color:
                                message.speaker === "Player"
                                  ? C.accent
                                  : C.gold
                            }
                          ]}
                        >
                          {message.speaker}
                        </Text>

                        {message.archiveDaytime ? (
                          <Text
                            style={[
                              styles.rollText,
                              { color: C.dim }
                            ]}
                          >
                            {message.archiveDaytime}
                          </Text>
                        ) : null}
                      </View>

                      {message.icon ? (
                        <View style={styles.mysteryMessageIconRow}>
                          <View style={[styles.mysteryMessageIconBubble, { borderColor: message.icon === "death" ? "#c41338" : C.line, backgroundColor: C.panel2 }]}>
                            <IconDumpIcon name={message.icon} size={42} />
                          </View>
                          <View style={styles.mysteryMessageIconText}>
                            <Text style={[styles.body, { color: C.text }]}>
                              {message.text}
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <Text style={[styles.body, { color: C.text }]}>
                          {message.text}
                        </Text>
                      )}

                      {message.roll ? (
                        <Text
                          style={[
                            styles.rollText,
                            { color: C.dim }
                          ]}
                        >
                          {message.roll}
                        </Text>
                      ) : null}
                    </Card>
                  ))
                : null}
            </View>
          );
        })}
        <Button label="Back" onPress={() => setScreen("mystery")} />
        </>
      )
    });
  }

  if (screen === "load") {
    const activeMysteries = mysteries.filter((mystery) => !mystery.finished);
    return (
      <Shell>
        <Text style={[styles.titleSmall, { color: C.text }]}>Load Game</Text>
        {activeMysteries.length === 0 ? <Text style={[styles.subtitle, { color: C.dim }]}>No open cases yet.</Text> : null}
        {activeMysteries.map((mystery) => (
          <Card key={mystery.id}>
            <Text style={[styles.heading, { color: C.text }]}>{mystery.title}</Text>
            <Text style={{ color: C.dim }}>{mystery.player.firstName} {mystery.player.familyName}, {mystery.player.sex}, age {mysteryPlayerAge(mystery.player)}, day {mystery.day}, {mystery.daytime}</Text>
            <View style={styles.row}>
              <Button small label="Open" onPress={() => { setActiveMysteryId(mystery.id); setScreen("mystery"); }} />
              <Button small label="Delete Save" onPress={() => removeMystery(mystery.id)} variant="warning" />
            </View>
          </Card>
        ))}
        <Button label="Back" onPress={() => setScreen("menu")} />
      </Shell>
    );
  }

  if (screen === "past") {
    const pastMysteries = mysteries.filter((mystery) => mystery.finished);
    return (
      <Shell>
        <Text style={[styles.titleSmall, { color: C.text }]}>Finished Games</Text>
        {pastMysteries.length === 0 ? <Text style={[styles.subtitle, { color: C.dim }]}>No closed cases yet.</Text> : null}
        {pastMysteries.map((mystery) => (
          <Card key={mystery.id}>
            <Text style={[styles.heading, { color: C.text }]}>{mystery.title}</Text>
            <Text style={[styles.body, { color: C.text }]}>{mystery.summary ?? (mystery.won ? "The case was solved." : "The case ended unsolved.")}</Text>
            <Text style={[styles.rollText, { color: mystery.won ? C.good : C.warning }]}>{mystery.won ? "Won" : "Lost"}</Text>
            <View style={styles.row}>
              <Button small label="Open Report" onPress={() => openMysteryJournal(mystery.id, "past")} />
              <Button small label="Delete Report" onPress={() => removeMystery(mystery.id)} variant="warning" />
            </View>
          </Card>
        ))}
        <Button label="Back" onPress={() => setScreen("menu")} />
      </Shell>
    );
  }

  if (screen === "medals") {
    const pastMysteries = mysteries.filter((mystery) => mystery.finished);
    const medalRows = mysteryMedalDefinitions.map((definition) => {
      const wonMysteries = pastMysteries.filter((mystery) => mysteryMedalIdsForFinishedGame(mystery).includes(definition.id));
      const winCount = pastMysteries.reduce((count, mystery) => count + mysteryMedalWinCountForFinishedGame(mystery, definition.id), 0);
      return { definition, wonMysteries, winCount };
    });
    const wonMedalCount = medalRows.filter((row) => row.wonMysteries.length > 0).length;
    const totalMedalWins = medalRows.reduce((count, row) => count + row.winCount, 0);
    return (
      <Shell>
        <View style={styles.rowBetween}>
          <Text style={[styles.titleSmall, { color: C.text }]}>Medals Won</Text>
          <Button small label="Back" onPress={() => setScreen("menu")} />
        </View>
        <Text style={[styles.subtitle, { color: C.dim }]}>
          {wonMedalCount} of {mysteryMedalDefinitions.length} medal types won, {totalMedalWins} total badge {totalMedalWins === 1 ? "win" : "wins"} from {pastMysteries.length} finished {pastMysteries.length === 1 ? "game" : "games"}.
        </Text>
        {pastMysteries.length === 0 ? <Text style={[styles.body, { color: C.dim }]}>No finished games yet. The medal list is ready for the next closed case.</Text> : null}
        {medalRows.map(({ definition, wonMysteries, winCount }) => {
          const won = winCount > 0;
          const targetMystery = wonMysteries[0];
          return (
            <Pressable
              key={definition.id}
              onPress={() => pressMedal(definition, targetMystery?.id)}
              style={[
                styles.card,
                styles.medalCard,
                {
                  backgroundColor: C.panel,
                  borderColor: won ? C.gold : C.line,
                  opacity: won ? 1 : 0.64
                }
              ]}
            >
              <Image source={definition.icon} resizeMode="cover" style={[styles.medalIcon, !won && styles.medalIconLocked]} />
              <View style={styles.medalTextColumn}>
                <View style={styles.rowBetween}>
                  <Text style={[styles.heading, styles.medalTitle, won && styles.medalWonTitleGlow, { color: won ? C.gold : C.text }]}>{definition.title}</Text>
                  <Text style={[styles.rollText, { color: won ? C.good : C.dim }]}>{won ? `Won ${winCount} x` : "Not won yet"}</Text>
                </View>
                <Text style={[styles.body, { color: won ? C.text : C.dim }]}>{definition.description}</Text>
                {won ? (
                  <Text style={[styles.rollText, { color: C.dim }]}>
                    Won in {wonMysteries.slice(0, 3).map((mystery) => mystery.title).join(", ")}{wonMysteries.length > 3 ? ` and ${wonMysteries.length - 3} more` : ""}.
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
        <Button label="Back" onPress={() => setScreen("menu")} />
      </Shell>
    );
  }

  if (screen === "settings") {
    return (
      <Shell>
        <Text style={[styles.titleSmall, { color: C.text }]}>Settings</Text>
        <Card>
          <Text style={[styles.label, { color: C.dim }]}>Theme</Text>
          <View style={styles.row}>
            <Button small label="Dark Story Book" onPress={() => setThemeName("dark")} />
            <Button small label="Pastel Story Book" onPress={() => setThemeName("pastel")} />
          </View>
          <Text style={[styles.body, { color: C.text }]}>Sound and language options will live here later.</Text>
        </Card>
        <Button label="Back" onPress={() => setScreen("menu")} />
      </Shell>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  backgroundImage: { flex: 1 },
  backgroundTint: { flex: 1 },
  scroll: { flex: 1 },
  container: { padding: 20, gap: 14 },
  fixedBottomContent: { paddingBottom: 124 },
  menuContainer: { flexGrow: 1, justifyContent: "flex-end", paddingBottom: 34 },
  overline: { fontSize: 15, letterSpacing: 4, marginTop: 12, textTransform: "uppercase" },
  title: { fontSize: 48, lineHeight: 54, fontWeight: "300" },
  titleSmall: { fontSize: 34, lineHeight: 40, fontWeight: "300" },
  subtitle: { fontSize: 17, lineHeight: 24 },
  menuTextShadow: {
    textShadowColor: "rgba(0, 0, 0, 0.42)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8
  },
  mysteryArchiveDayHeader: {
    minHeight: 62,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 10,
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },

  mysteryArchiveArrow: {
    fontSize: 18,
    fontWeight: "800",
    marginLeft: 12
  },
  card: { borderWidth: 1, borderRadius: 8, padding: 16, gap: 10 },
  deadTile: { backgroundColor: "#2f3033", borderColor: "#858585", borderWidth: 2, shadowColor: "#707070", shadowOpacity: 0.18, shadowRadius: 4, elevation: 0 },
  deadRelationCard: { backgroundColor: "#303136", shadowOpacity: 0.12 },
  relationCard: { gap: 8, padding: 12 },
  relationCardGrid: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  relationMainColumn: { flex: 1, minWidth: 0, gap: 8 },
  relationActionColumn: { width: 132, gap: 8, alignItems: "stretch" },
  relationOrderRow: { flexDirection: "row", flexWrap: "wrap" },
  relationActionList: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-start" },
  relationActionLabel: { fontSize: 10 },
  relationName: { fontSize: 19, lineHeight: 23 },
  relationCardDragging: { opacity: 0.72 },
  focusedMysteryNpcCard: { borderWidth: 2, shadowOpacity: 0.28, shadowRadius: 10, elevation: 4 },
  relationHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  relationshipSection: { gap: 10 },
  field: { gap: 6 },
  label: { fontSize: 13, letterSpacing: 2, textTransform: "uppercase" },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16 },
  notesInput: { minHeight: 150, textAlignVertical: "top" },
  button: { minHeight: 48, borderRadius: 8, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", marginRight: 8, marginTop: 6 },
  buttonSmall: { minHeight: 40 },
  buttonText: { color: "#fff", fontWeight: "700" },
  chip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginRight: 8, marginBottom: 8 },
  chipText: { color: "#fff", fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  wrapRow: { flexDirection: "row", flexWrap: "wrap" },
  heading: { fontSize: 22, fontWeight: "700" },
  medalTitle: { flex: 1, minWidth: 0 },
  medalWonTitleGlow: {
    textShadowColor: "#f0c45c",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10
  },
  medalCard: { flexDirection: "row", alignItems: "center", gap: 14 },
  medalIcon: { width: 72, height: 72, borderRadius: 36 },
  medalIconLocked: { opacity: 0.42 },
  medalTextColumn: { flex: 1, minWidth: 0, gap: 4 },
  closedReportHero: { borderWidth: 1, borderRadius: 8, padding: 16, gap: 8 },
  closedReportHeroTitle: { fontSize: 28, lineHeight: 34 },
  closedReportStatGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  closedReportStatBox: { width: "31.5%", minWidth: 98, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  closedReportStatValue: { fontSize: 25, lineHeight: 30, fontWeight: "800" },
  closedReportStatLabel: { fontSize: 10, lineHeight: 13, fontWeight: "900", textTransform: "uppercase", textAlign: "center" },
  body: { fontSize: 16, lineHeight: 23, marginTop: 4 },
  clickableNpcName: { fontWeight: "800", textDecorationLine: "underline" },
  storyFrame: { borderWidth: 1, borderRadius: 8, overflow: "hidden", padding: 8, gap: 8 },
  storyPanelRow: { flexDirection: "row", minHeight: 250, gap: 8 },
  storyPlacePanel: { width: 116, minHeight: 250, borderRadius: 8, overflow: "hidden" },
  storyPlaceImage: { opacity: 0.92 },
  storyPlaceTint: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 10, backgroundColor: "rgba(10, 7, 7, 0.42)" },
  storyPlaceLabel: { color: "#e9d4b6", fontSize: 17, lineHeight: 20, fontWeight: "400" },
  storyYearNumber: { color: "#f5e3c8", fontSize: 52, lineHeight: 58, fontWeight: "300" },
  storyPlaceSmall: { color: "#d5c0a4", fontSize: 10, textTransform: "uppercase", marginTop: 8 },
  storyPlaceName: { color: "#f5e3c8", fontSize: 15, lineHeight: 20, fontWeight: "700", textAlign: "center" },
  storyTextPanel: { flex: 1, minWidth: 0, borderWidth: 1, borderRadius: 8, padding: 12, gap: 8 },
  storyPlayerHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  storyPlayerHeaderText: { flex: 1, minWidth: 0 },
  storyPlayerName: { fontSize: 20, lineHeight: 24 },
  storyBackground: { minHeight: 470 },
  storyBackgroundImage: { opacity: 0.82 },
  storyTint: { flex: 1, minHeight: 470, padding: 16, gap: 10 },
  storyMessages: { maxHeight: 160 },
  storyBubble: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 8 },
  storyMessageBlock: { marginBottom: 10 },
  storySpeaker: { fontSize: 12, fontWeight: "800", letterSpacing: 1.4, textTransform: "uppercase" },
  rollText: { fontSize: 12, lineHeight: 16 },
  storyChoiceStack: { gap: 6 },
  storyChoiceRow: { minHeight: 38, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, justifyContent: "center" },
  storyChoiceText: { fontSize: 11, fontWeight: "900", letterSpacing: 1.2, textTransform: "uppercase" },
  storyChoiceMeta: { fontSize: 10, fontWeight: "700", marginTop: 2, textTransform: "uppercase" },
  storyInputPanel: { minHeight: 76, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, paddingRight: 86, justifyContent: "center" },
  storyInputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  storyInput: { minHeight: 40, maxHeight: 90, paddingHorizontal: 0, paddingVertical: 0, fontSize: 14, textAlignVertical: "top" },
  storySendButton: { position: "absolute", right: 8, top: 10 },
  storyCount: { position: "absolute", left: 12, bottom: 8 },
  scenePill: { borderRadius: 8, overflow: "hidden", paddingHorizontal: 10, paddingVertical: 7, fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  portrait: { width: 132, minHeight: 224, borderWidth: 1, borderRadius: 8, padding: 10, alignItems: "center", justifyContent: "space-between" },
  portraitStage: { fontSize: 11, textTransform: "uppercase" },
  portraitImageFrame: { width: 72, height: 128, borderWidth: 1, borderRadius: 8, overflow: "hidden" },
  portraitHeroFrame: { width: 114, height: 190, borderWidth: 1, borderRadius: 8, overflow: "hidden" },
  portraitImage: { width: "100%", height: "100%" },
  ravenwoodPortraitSheet: { position: "absolute" },
  portraitResidentFrame: { width: 92, height: 156, borderWidth: 1, borderRadius: 8, overflow: "hidden" },
  portraitMapFrame: { width: 42, height: 66, borderWidth: 1, borderRadius: 8, overflow: "hidden" },
  portraitTreeFrame: { width: 52, height: 86, borderWidth: 1, borderRadius: 8, overflow: "hidden" },
  portraitTreeSelectedFrame: { borderWidth: 3, borderColor: "#ff3048", shadowColor: "#ff3048", shadowOpacity: 0.95, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 10 },
  portraitThumbFrame: { width: 36, height: 62, borderWidth: 1, borderRadius: 8, overflow: "hidden" },
  portraitThumb: { width: "100%", height: "100%" },
  picturelessPortrait: { alignItems: "center", justifyContent: "center", gap: 4 },
  picturelessInitials: { fontWeight: "900", textAlign: "center" },
  picturelessMeta: { fontWeight: "700", textTransform: "uppercase", textAlign: "center" },
  portraitHairOverlayLarge: { position: "absolute", left: 6, top: -3, width: 62, height: 62 },
  portraitHairOverlayThumb: { position: "absolute", left: 3, top: -1, width: 30, height: 30 },
  deadPortraitFrame: { backgroundColor: "#242528", borderColor: "#777" },
  deadPortraitWash: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(110, 110, 110, 0.26)" },
  face: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center" },
  faceText: { color: "#fff", fontSize: 28, fontWeight: "800" },
  portraitName: { fontWeight: "700", fontSize: 16 },
  portraitDetail: { fontSize: 11, textAlign: "center" },
  stat: { marginTop: 4 },
  bar: { height: 8, borderRadius: 8, overflow: "hidden", marginTop: 5 },
  barFill: { height: "100%", borderRadius: 8 },
  statStrip: { flexDirection: "row", alignItems: "stretch", borderWidth: 1, borderRadius: 8, overflow: "hidden", marginTop: 12, paddingVertical: 9 },
  statStripItem: { flex: 1, minWidth: 0, alignItems: "center", justifyContent: "center", paddingHorizontal: 7, borderRightWidth: 1 },
  statStripItemLast: { borderRightWidth: 0 },
  statStripLabel: { fontSize: 8, lineHeight: 11, fontWeight: "900", letterSpacing: 0, textTransform: "uppercase" },
  statStripValue: { fontSize: 24, lineHeight: 30, fontWeight: "300", marginTop: 2 },
  statStripBar: { width: "100%", maxWidth: 48, height: 5, borderRadius: 8, overflow: "hidden", marginTop: 7 },
  statStripFill: { height: "100%", borderRadius: 8 },
  relationStatStrip: { flexDirection: "row", borderWidth: 1, borderRadius: 8, overflow: "hidden", paddingVertical: 7 },
  relationStatItem: { flex: 1, minWidth: 0, alignItems: "center", justifyContent: "center", paddingHorizontal: 6, borderRightWidth: 1 },
  relationStatLabel: { fontSize: 8, lineHeight: 11, fontWeight: "900", letterSpacing: 0, textTransform: "uppercase" },
  relationStatValue: { fontSize: 21, lineHeight: 26, fontWeight: "300", marginTop: 1 },
  relationStatBar: { width: "100%", maxWidth: 44, height: 5, borderRadius: 8, overflow: "hidden", marginTop: 5 },
  mysteryTrustPill: { minWidth: 56, minHeight: 34, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignItems: "center", justifyContent: "center" },
  intoxicatedTrustPill: { shadowColor: "#ff2222", shadowOpacity: 0.45, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  mysteryTrustPillLabel: { fontSize: 8, lineHeight: 10, fontWeight: "900", textTransform: "uppercase" },
  mysteryTrustPillValue: { fontSize: 18, lineHeight: 20, fontWeight: "800" },
  mysteryRomancePillLabel: { marginTop: 4 },
  mysteryRomancePillValue: { fontSize: 16, lineHeight: 18 },
  // Purple is debug/testing only; red is discoverable information hidden in real play.
  gameHiddenText: { color: "#b97cff", fontWeight: "800" },
  discoverableHiddenText: { color: "#ff4d4d", fontWeight: "800" },
  characterHeader: { flexDirection: "row", alignItems: "center", gap: 14 },
  characterHeaderText: { flex: 1, minWidth: 0, gap: 4 },
  fixedBottomMenu: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12, borderTopWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  bottomMenu: { flexDirection: "row", borderWidth: 1, borderRadius: 8, marginTop: 8, position: "relative" },
  bottomMenuItem: { flex: 1, minHeight: 94, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, paddingVertical: 7, borderRightWidth: 1 },
  bottomMenuLabel: { minHeight: 78, alignItems: "center", justifyContent: "center", gap: 3 },
  bottomMenuIconStage: { width: 66, height: 58, alignItems: "center", justifyContent: "center" },
  bottomMenuText: { fontSize: 12, lineHeight: 14, fontWeight: "800", textAlign: "center" },
  compassMenuButton: { position: "absolute", left: "50%", top: -28, width: 74, height: 74, marginLeft: -37, alignItems: "center", justifyContent: "center", zIndex: 12 },
  compassOuter: { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center", overflow: "visible" },
  compassGlowImage: { position: "absolute" },
  compassGlowImageWide: { width: 106, height: 106 },
  compassGlowImageTall: { width: 98, height: 98 },
  compassImage: { width: 68, height: 68, borderRadius: 34 },
  iconDumpFrame: { overflow: "hidden", alignItems: "center", justifyContent: "center" },
  iconDumpSheet: { position: "absolute" },
  mysteryHeaderProfile: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 10, flex: 1, minWidth: 0 },
  mysteryHeaderName: { flexShrink: 1, textAlign: "right" },
  detectiveCarousel: { gap: 14, paddingRight: 12 },
  detectiveCard: { width: 268, borderWidth: 1, borderRadius: 8, padding: 14, gap: 10, alignItems: "center" },
  detectiveName: { textAlign: "center" },
  detectiveAgeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  detectiveAgeCard: { width: 148, borderWidth: 1, borderRadius: 8, padding: 12, alignItems: "center", gap: 8 },
  detectiveAgeLabel: { fontSize: 18, lineHeight: 22 },
  mysteryStoryFrame: { minHeight: 0 },
  chatAiTestPanel: { borderWidth: 1, borderRadius: 8, padding: 10, gap: 8 },
  chatAiTestInput: { minHeight: 54, maxHeight: 90, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, textAlignVertical: "top" },
  mysteryMessageIconRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  mysteryMessageIconBubble: { width: 54, height: 54, borderWidth: 1, borderRadius: 8, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  mysteryMessageIconText: { flex: 1, minWidth: 0 },
  arrivalPopupCard: { gap: 14 },
  arrivalPopupTitle: { textAlign: "center" },
  arrivalPopupList: { gap: 10 },
  arrivalPopupRow: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 8, padding: 10 },
  arrivalPopupIcon: { width: 58, height: 58, borderWidth: 1, borderRadius: 8, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  arrivalPopupText: { flex: 1, minWidth: 0, gap: 2 },
  roomActionPanel: { paddingHorizontal: 10, paddingVertical: 8, gap: 8 },
  closedDoorRoomName: { flex: 1, minWidth: 0, textAlign: "right" },
  doorActionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  doorActionButton: { width: 82, height: 70, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, gap: 3 },
  doorActionLabel: { fontSize: 10, lineHeight: 13, fontWeight: "900", textAlign: "center" },
  mysteryDayPanel: { alignItems: "center", justifyContent: "center", padding: 10, borderWidth: 1, borderColor: "rgba(240, 196, 92, 0.28)" },
  ravenwoodBubbleBackdrop: { overflow: "hidden" },
  ravenwoodBubbleBackdropImage: { borderRadius: 8 },
  ravenwoodSceneBackdropImage: { borderRadius: 8 },
  mysterySceneHeader: { minHeight: 144, borderWidth: 1, borderRadius: 8, padding: 10, flexDirection: "row", alignItems: "center", gap: 12 },
  mysterySceneMeta: { flex: 1, minWidth: 0, justifyContent: "center" },
  mysterySceneMetaRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  mysteryScenePlaceBlock: { flex: 1, minWidth: 0 },
  mysteryScenePlaceName: { color: "#f5e3c8", fontSize: 21, lineHeight: 26, fontWeight: "800" },
  mysteryTextPanelWide: { minHeight: 260 },
  mysteryChatInsideStack: { gap: 10 },
  mysteryStoryMessages: { maxHeight: 300 },
  mysteryDossierGrid: { gap: 4 },
  residentHeaderBody: { flex: 1, minWidth: 0, alignItems: "flex-start", gap: 10 },
  mysteryPortraitMagnifierButton: { width: 74, height: 74, borderWidth: 1, borderRadius: 8, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  solveButtonRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  solveButton: { minWidth: 138, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: "#b5122b", borderWidth: 1, borderColor: "#f0c45c" },
  solveButtonText: { color: "#fff4ec", fontSize: 12, lineHeight: 15, fontWeight: "900" },
  solveButtonSub: { color: "#f6d7c7", fontSize: 10, lineHeight: 13, marginTop: 2 },
  selectorRow: { borderWidth: 1, borderRadius: 8, padding: 10, gap: 4 },
  dropdownGroup: { gap: 4 },
  dropdownArrow: { fontSize: 15, lineHeight: 18, fontWeight: "900" },
  dropdownList: { maxHeight: 190, borderWidth: 1, borderRadius: 8 },
  dropdownOption: { borderBottomWidth: 1, paddingHorizontal: 10, paddingVertical: 8, gap: 2 },
  dropdownInventoryOption: { flexDirection: "row", alignItems: "center", gap: 8 },
  dropdownOptionText: { flex: 1, minWidth: 0 },
  dropdownEmpty: { padding: 10 },
  accusationConfidencePanel: { borderWidth: 1, borderRadius: 8, padding: 10, gap: 7 },
  accusationConfidenceRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  accusationConfidenceLabel: { width: 54 },
  accusationConfidenceValue: { flex: 1, minWidth: 0, fontWeight: "900" },
  accusationMotiveInput: { minHeight: 92, textAlignVertical: "top" },
  substanceBubbleRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 2 },
  substanceBubble: { overflow: "hidden", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: "#ff2222", color: "#fff", fontSize: 10, lineHeight: 13, fontWeight: "900", textTransform: "uppercase" },
  relationshipLedgerBox: { borderWidth: 1, borderRadius: 8, padding: 10, gap: 4 },
  ledgerBox: { borderWidth: 1, borderRadius: 8, padding: 10, gap: 3, maxHeight: 420 },
  ledgerText: { fontSize: 11, lineHeight: 15, fontFamily: "monospace" },
  mysteryMapGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  mysteryRoomTile: { width: "48%", minHeight: 112, borderWidth: 1, borderRadius: 8, padding: 10, gap: 6, overflow: "hidden", position: "relative" },
  mysteryMapRoomContent: { position: "relative", zIndex: 2, gap: 6 },
  mapFogOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 1, alignItems: "center", justifyContent: "center" },
  mapFogImage: { width: "170%", height: "170%" },
  mysteryRoomName: { fontSize: 14, fontWeight: "800" },
  mapPortraitButton: { borderRadius: 8 },
  mapPlayerInFogRow: { flexDirection: "row", alignItems: "center" },
  mapPlayerInFogButton: { borderRadius: 8 },
  mysteryFamilyTreeShell: { borderWidth: 2, borderRadius: 8, overflow: "hidden", minHeight: 430 },
  mysteryFamilyTreeTitleBar: { minHeight: 34, justifyContent: "center", paddingHorizontal: 10, borderBottomWidth: 1 },
  mysteryFamilyTreeTitle: { fontSize: 15, lineHeight: 19, fontWeight: "900" },
  mysteryFamilyTreeViewport: { flexGrow: 0, height: 430 },
  mysteryFamilyTreeCanvas: { minWidth: 620, minHeight: 390, position: "relative" },
  mysteryFamilyTreeLineLayer: { ...StyleSheet.absoluteFillObject },
  mysteryFamilyTreeLineSegment: { position: "absolute", borderRadius: 8 },
  mysteryFamilyTreeNode: { position: "absolute", width: 118, minHeight: 112, borderWidth: 0, borderRadius: 8, padding: 4, flexDirection: "column", alignItems: "center", justifyContent: "flex-start", gap: 5 },
  mysteryFamilyTreeNodeNoText: { justifyContent: "center" },
  mysteryFamilyTreeNodeSelected: { shadowOpacity: 0.78, shadowRadius: 13, shadowOffset: { width: 0, height: 0 }, elevation: 9 },
  mysteryFamilyTreeNodeText: { width: "100%", alignItems: "center" },
  mysteryFamilyTreeNodeName: { fontSize: 10, lineHeight: 13, fontWeight: "900", textTransform: "lowercase", textAlign: "center" },
  mysteryFamilyTreeNodeMeta: { fontSize: 8, lineHeight: 11, fontWeight: "800", textAlign: "center" },
  itemRow: { borderTopWidth: 1, paddingTop: 10, gap: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" },
  itemNameRow: { flex: 1, minWidth: 190, flexDirection: "row", alignItems: "center", gap: 9 },
  inventoryItemIconBubble: { width: 40, height: 40, alignItems: "center", justifyContent: "center", overflow: "visible" },
  itemName: { flex: 1, minWidth: 0, flexShrink: 1, fontWeight: "800" },
  modalShade: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.62)", alignItems: "center", justifyContent: "center", padding: 20 },
  modalCard: { width: "100%", maxWidth: 420, borderWidth: 1, borderRadius: 8, padding: 16, gap: 10 },
  bodyDiscoveryCard: { borderWidth: 2, shadowColor: "#c41338", shadowOpacity: 0.38, shadowRadius: 16, shadowOffset: { width: 0, height: 0 }, elevation: 10 },
  bodyDiscoveryHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  bodyDiscoveryIconBubble: { width: 62, height: 62, borderWidth: 2 },
  bodyDiscoveryTitle: { flex: 1, minWidth: 0 },
  modalCloseButton: { width: 38, height: 38, borderWidth: 1, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  modalCloseText: { fontSize: 18, lineHeight: 22, fontWeight: "900" },
  reportHero: { flexDirection: "row", alignItems: "center", gap: 14 },
  reportHeroText: { flex: 1, minWidth: 0, gap: 6 },
  reportCrimeRow: { borderTopWidth: 1, paddingTop: 10, marginTop: 6, flexDirection: "row", alignItems: "center", gap: 10 },
  reportCrimeText: { flex: 1, minWidth: 0, gap: 3 },
  reportItemRow: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 6 },
  reportItemText: { flex: 1, minWidth: 0 },
  reportSubheading: { marginTop: 12 },
  reportPortraitRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
  reportPortraitTile: { width: 74, alignItems: "center", gap: 4 },
  reportPortraitLabel: { textAlign: "center" },
  reportBondRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 7 }
});
