 interface IdDocSet {
  idDocSetType: string;
  types: string[];
  subTypes?: string[];
  videoRequired?: string;
}

 interface RequiredIdDocs {
  docSets: IdDocSet[];
}

 interface Review {
  reviewId: string;
  attemptId: string;
  attemptCnt: number;
  elapsedSincePendingMs: number;
  elapsedSinceQueuedMs: number;
  reprocessing: boolean;
  levelName: string;
  levelAutoCheckMode: string | null;
  createDate: string;
  reviewDate?: string;
  reviewResult: ReviewResult;
  reviewStatus: string;
  confirmed: boolean;
  priority: number;
}

interface ReviewResult {
  reviewAnswer: string;
  buttonIds?: string[];
  rejectionReason?: 'FINAL' | 'RETRY';
  moderationComment?: string;
  clientComment?: string;
}

interface Address {
  street: string;
  streetEn: string;
  state: string;
  stateEn: string;
  town: string;
  townEn: string;
  postCode: string;
  country: string;
  formattedAddress: string;
}

export interface IdDoc {
  idDocType: string;
  country: string;
  firstName: string;
  firstNameEn: string;
  lastName: string;
  lastNameEn: string;
  issuedDate: string;
  issueAuthorityCode?: string;
  validUntil: string;
  number: string;
  dob: string;
  gender: string;
  address?: Address;
  additionalNumber?: string;
}

interface Info {
  firstName: string;
  firstNameEn: string;
  lastName: string;
  lastNameEn: string;
  dateOfBirth?: string;
  dob: string;
  country: string;
  gender: string;
  placeOfBirth?: string;
  placeOfBirthEn?: string;
  taxResidenceCountry?: string;
  nationality?: string;
  countryOfBirth?: string;
  stateOfBirth?: string;
  phone?: string;
  addresses?: Address[];
  tin?: string;
  idDocs?: IdDoc[];
  legalName?: string;
  isDocs?: IdDoc[];
}

interface FixedInfo {
  taxResidenceCountry?: string;
  phone?: string;
}

interface Agreement {
  createdAt: string;
  acceptedAt: string;
  source: string;
  targets: string[];
}

export interface GetInfoDto {
  id: string;
  createdAt: string;
  key: string;
  clientId: string;
  inspectionId: string;
  externalUserId: string;
  email: string;
  applicantPlatform: string;
  requiredIdDocs: RequiredIdDocs;
  review: Review;
  type: string;
  ipCountry: string;
  info: Info;
  fixedInfo?: FixedInfo;
  authCode?: string;
  agreement: Agreement;
  lang: string;
}



    