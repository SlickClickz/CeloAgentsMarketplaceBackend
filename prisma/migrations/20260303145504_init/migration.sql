-- CreateEnum
CREATE TYPE "Network" AS ENUM ('mainnet', 'testnet');

-- CreateEnum
CREATE TYPE "SkillCategory" AS ENUM ('stablecoin-savings', 'yield-optimization', 'token-swap', 'cross-chain-transfer', 'payment-automation', 'data-oracle', 'nft-management', 'governance', 'other');

-- CreateEnum
CREATE TYPE "FlagType" AS ENUM ('SKILL_MISMATCH', 'INACTIVE', 'NEW_AGENT', 'UNVERIFIED');

-- CreateEnum
CREATE TYPE "FlagSeverity" AS ENUM ('info', 'warning', 'critical');

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "network" "Network" NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "tokenURI" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "x402Endpoint" TEXT,
    "selfClawVerified" BOOLEAN NOT NULL DEFAULT false,
    "rawSkillMd" TEXT NOT NULL,
    "registrationTimestamp" TIMESTAMP(3) NOT NULL,
    "lastIndexedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_skills" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "network" "Network" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "SkillCategory" NOT NULL,
    "inputTypes" TEXT[],
    "outputTypes" TEXT[],
    "version" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_scores" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "network" "Network" NOT NULL,
    "total" INTEGER NOT NULL,
    "identityScore" INTEGER NOT NULL,
    "executionScore" INTEGER NOT NULL,
    "integrityScore" INTEGER NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_score_history" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "network" "Network" NOT NULL,
    "total" INTEGER NOT NULL,
    "identityScore" INTEGER NOT NULL,
    "executionScore" INTEGER NOT NULL,
    "integrityScore" INTEGER NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_score_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_flags" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "network" "Network" NOT NULL,
    "type" "FlagType" NOT NULL,
    "message" TEXT NOT NULL,
    "severity" "FlagSeverity" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingester_state" (
    "id" TEXT NOT NULL,
    "network" "Network" NOT NULL,
    "lastBlock" BIGINT NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingester_state_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agents_network_idx" ON "agents"("network");

-- CreateIndex
CREATE INDEX "agents_walletAddress_idx" ON "agents"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "agents_agentId_network_key" ON "agents"("agentId", "network");

-- CreateIndex
CREATE INDEX "agent_skills_agentId_network_idx" ON "agent_skills"("agentId", "network");

-- CreateIndex
CREATE INDEX "agent_skills_category_idx" ON "agent_skills"("category");

-- CreateIndex
CREATE INDEX "agent_scores_network_total_idx" ON "agent_scores"("network", "total");

-- CreateIndex
CREATE UNIQUE INDEX "agent_scores_agentId_network_key" ON "agent_scores"("agentId", "network");

-- CreateIndex
CREATE INDEX "agent_score_history_agentId_network_recordedAt_idx" ON "agent_score_history"("agentId", "network", "recordedAt");

-- CreateIndex
CREATE INDEX "agent_flags_agentId_network_idx" ON "agent_flags"("agentId", "network");

-- CreateIndex
CREATE UNIQUE INDEX "ingester_state_network_key" ON "ingester_state"("network");

-- AddForeignKey
ALTER TABLE "agent_skills" ADD CONSTRAINT "agent_skills_agentId_network_fkey" FOREIGN KEY ("agentId", "network") REFERENCES "agents"("agentId", "network") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_scores" ADD CONSTRAINT "agent_scores_agentId_network_fkey" FOREIGN KEY ("agentId", "network") REFERENCES "agents"("agentId", "network") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_score_history" ADD CONSTRAINT "agent_score_history_agentId_network_fkey" FOREIGN KEY ("agentId", "network") REFERENCES "agents"("agentId", "network") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_flags" ADD CONSTRAINT "agent_flags_agentId_network_fkey" FOREIGN KEY ("agentId", "network") REFERENCES "agents"("agentId", "network") ON DELETE CASCADE ON UPDATE CASCADE;
