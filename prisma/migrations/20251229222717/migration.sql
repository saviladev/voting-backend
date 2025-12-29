-- CreateTable
CREATE TABLE "Election" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "scope" "PartyScope" NOT NULL DEFAULT 'NATIONAL',
    "associationId" TEXT NOT NULL,
    "branchId" TEXT,
    "chapterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Election_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectionPosition" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "electionId" TEXT NOT NULL,

    CONSTRAINT "ElectionPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateList" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "number" INTEGER,
    "electionId" TEXT NOT NULL,
    "politicalPartyId" TEXT,

    CONSTRAINT "CandidateList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "dni" VARCHAR(20),
    "photoUrl" TEXT,
    "candidateListId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Election_associationId_idx" ON "Election"("associationId");

-- CreateIndex
CREATE INDEX "Election_status_idx" ON "Election"("status");

-- CreateIndex
CREATE INDEX "ElectionPosition_electionId_idx" ON "ElectionPosition"("electionId");

-- CreateIndex
CREATE INDEX "CandidateList_electionId_idx" ON "CandidateList"("electionId");

-- CreateIndex
CREATE INDEX "Candidate_candidateListId_idx" ON "Candidate"("candidateListId");

-- CreateIndex
CREATE INDEX "Candidate_positionId_idx" ON "Candidate"("positionId");

-- AddForeignKey
ALTER TABLE "Election" ADD CONSTRAINT "Election_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "Association"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Election" ADD CONSTRAINT "Election_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Election" ADD CONSTRAINT "Election_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectionPosition" ADD CONSTRAINT "ElectionPosition_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateList" ADD CONSTRAINT "CandidateList_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateList" ADD CONSTRAINT "CandidateList_politicalPartyId_fkey" FOREIGN KEY ("politicalPartyId") REFERENCES "PoliticalParty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_candidateListId_fkey" FOREIGN KEY ("candidateListId") REFERENCES "CandidateList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "ElectionPosition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
