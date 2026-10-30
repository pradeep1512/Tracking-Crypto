-- =========================================================================================
-- TRACKINGCRYPT - SQL SERVER MANAGEMENT STUDIO (SSMS) MASTER SETUP SCRIPT
-- =========================================================================================
-- Target Database: TrackingCrypt
-- Target Engine:   Microsoft SQL Server 2019 / 2022 / 2025
--
-- INSTRUCTIONS FOR SQL SERVER MANAGEMENT STUDIO (SSMS):
-- 1. Open SQL Server Management Studio (SSMS).
-- 2. Connect to Server:
--      Server name:    localhost   (or . or 127.0.0.1)
--      Authentication: Windows Authentication
-- 3. In SSMS: File -> Open -> File... -> Select SSMS_SETUP_TRACKINGCRYPT.sql
-- 4. Press F5 (or click 'Execute' on the SSMS toolbar).
-- =========================================================================================

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'TrackingCrypt')
BEGIN
    CREATE DATABASE [TrackingCrypt];
    PRINT 'Database [TrackingCrypt] created successfully.';
END
ELSE
BEGIN
    PRINT 'Database [TrackingCrypt] already exists.';
END;
GO

USE [TrackingCrypt];
GO

BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Users] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000),
    [email] NVARCHAR(1000) NOT NULL,
    [emailVerified] DATETIME2,
    [image] NVARCHAR(1000),
    [passwordHash] NVARCHAR(1000),
    [role] NVARCHAR(1000) NOT NULL CONSTRAINT [Users_role_df] DEFAULT 'USER',
    [isActive] BIT NOT NULL CONSTRAINT [Users_isActive_df] DEFAULT 1,
    [lastLoginAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Users_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Users_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Users_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[PasswordResetTokens] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [tokenHash] NVARCHAR(1000) NOT NULL,
    [expiresAt] DATETIME2 NOT NULL,
    [usedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [PasswordResetTokens_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PasswordResetTokens_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [PasswordResetTokens_tokenHash_key] UNIQUE NONCLUSTERED ([tokenHash])
);

-- CreateTable
CREATE TABLE [dbo].[Accounts] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [provider] NVARCHAR(1000) NOT NULL,
    [providerAccountId] NVARCHAR(1000) NOT NULL,
    [refresh_token] TEXT,
    [access_token] TEXT,
    [expires_at] INT,
    [token_type] NVARCHAR(1000),
    [scope] NVARCHAR(1000),
    [id_token] TEXT,
    [session_state] NVARCHAR(1000),
    CONSTRAINT [Accounts_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Accounts_provider_providerAccountId_key] UNIQUE NONCLUSTERED ([provider],[providerAccountId])
);

-- CreateTable
CREATE TABLE [dbo].[Sessions] (
    [id] NVARCHAR(1000) NOT NULL,
    [sessionToken] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [expires] DATETIME2 NOT NULL,
    CONSTRAINT [Sessions_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Sessions_sessionToken_key] UNIQUE NONCLUSTERED ([sessionToken])
);

-- CreateTable
CREATE TABLE [dbo].[VerificationTokens] (
    [identifier] NVARCHAR(1000) NOT NULL,
    [token] NVARCHAR(1000) NOT NULL,
    [expires] DATETIME2 NOT NULL,
    CONSTRAINT [VerificationTokens_token_key] UNIQUE NONCLUSTERED ([token]),
    CONSTRAINT [VerificationTokens_identifier_token_key] UNIQUE NONCLUSTERED ([identifier],[token])
);

-- CreateTable
CREATE TABLE [dbo].[Exchanges] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000) NOT NULL,
    [baseApiUrl] NVARCHAR(1000) NOT NULL,
    [wsUrl] NVARCHAR(1000),
    [isEnabled] BIT NOT NULL CONSTRAINT [Exchanges_isEnabled_df] DEFAULT 1,
    [isMock] BIT NOT NULL CONSTRAINT [Exchanges_isMock_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Exchanges_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Exchanges_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Exchanges_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[TradingPairs] (
    [id] NVARCHAR(1000) NOT NULL,
    [exchangeId] NVARCHAR(1000) NOT NULL,
    [symbol] NVARCHAR(1000) NOT NULL,
    [baseCurrency] NVARCHAR(1000) NOT NULL,
    [quoteCurrency] NVARCHAR(1000) NOT NULL,
    [isEnabled] BIT NOT NULL CONSTRAINT [TradingPairs_isEnabled_df] DEFAULT 1,
    [minQuantity] DECIMAL(30,10),
    [maxQuantity] DECIMAL(30,10),
    [tickSize] DECIMAL(30,10),
    [stepSize] DECIMAL(30,10),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TradingPairs_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [TradingPairs_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [TradingPairs_exchangeId_symbol_key] UNIQUE NONCLUSTERED ([exchangeId],[symbol])
);

-- CreateTable
CREATE TABLE [dbo].[MarketSnapshots] (
    [id] NVARCHAR(1000) NOT NULL,
    [exchangeId] NVARCHAR(1000) NOT NULL,
    [tradingPairId] NVARCHAR(1000) NOT NULL,
    [lastPrice] DECIMAL(30,10) NOT NULL,
    [bestBid] DECIMAL(30,10) NOT NULL,
    [bestAsk] DECIMAL(30,10) NOT NULL,
    [bidQuantity] DECIMAL(30,10) NOT NULL,
    [askQuantity] DECIMAL(30,10) NOT NULL,
    [spread] DECIMAL(30,10) NOT NULL,
    [spreadPercentage] DECIMAL(10,6) NOT NULL,
    [volume24h] DECIMAL(30,10),
    [high24h] DECIMAL(30,10),
    [low24h] DECIMAL(30,10),
    [exchangeTimestamp] DATETIME2 NOT NULL,
    [receivedAt] DATETIME2 NOT NULL,
    [dataAgeMs] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [MarketSnapshots_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [MarketSnapshots_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[OrderBookLevels] (
    [id] NVARCHAR(1000) NOT NULL,
    [exchangeId] NVARCHAR(1000) NOT NULL,
    [tradingPairId] NVARCHAR(1000) NOT NULL,
    [side] NVARCHAR(1000) NOT NULL,
    [price] DECIMAL(30,10) NOT NULL,
    [quantity] DECIMAL(30,10) NOT NULL,
    [snapshotTimestamp] DATETIME2 NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [OrderBookLevels_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [OrderBookLevels_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[PriceGapEvents] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000),
    [exchangeId] NVARCHAR(1000) NOT NULL,
    [tradingPairId] NVARCHAR(1000) NOT NULL,
    [side] NVARCHAR(1000) NOT NULL,
    [referencePrice] DECIMAL(30,10) NOT NULL,
    [observedPrice] DECIMAL(30,10) NOT NULL,
    [estimatedExecutionPrice] DECIMAL(30,10) NOT NULL,
    [quantity] DECIMAL(30,10),
    [gapAmount] DECIMAL(30,10) NOT NULL,
    [gapPercentage] DECIMAL(10,6) NOT NULL,
    [additionalCost] DECIMAL(30,10),
    [dataAgeMs] INT NOT NULL,
    [detectionTimestamp] DATETIME2 NOT NULL,
    [gapClassification] NVARCHAR(1000) NOT NULL,
    [isWithinTolerance] BIT NOT NULL CONSTRAINT [PriceGapEvents_isWithinTolerance_df] DEFAULT 0,
    [tolerancePercentage] DECIMAL(10,6),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [PriceGapEvents_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PriceGapEvents_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[LatencyMetrics] (
    [id] NVARCHAR(1000) NOT NULL,
    [exchangeId] NVARCHAR(1000) NOT NULL,
    [tradingPairId] NVARCHAR(1000) NOT NULL,
    [exchangeEventTimestamp] DATETIME2 NOT NULL,
    [serverReceivedAt] DATETIME2 NOT NULL,
    [browserReceivedAt] DATETIME2,
    [orderSubmittedAt] DATETIME2,
    [exchangeAcknowledgedAt] DATETIME2,
    [executionTimestamp] DATETIME2,
    [measuredLatencyMs] INT NOT NULL,
    [e2eLatencyMs] INT,
    [metricType] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [LatencyMetrics_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [LatencyMetrics_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[TradingOrders] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [exchangeId] NVARCHAR(1000) NOT NULL,
    [tradingPairId] NVARCHAR(1000) NOT NULL,
    [side] NVARCHAR(1000) NOT NULL,
    [orderType] NVARCHAR(1000) NOT NULL,
    [requestedQuantity] DECIMAL(30,10) NOT NULL,
    [limitPrice] DECIMAL(30,10),
    [averageExecutionPrice] DECIMAL(30,10),
    [filledQuantity] DECIMAL(30,10) NOT NULL CONSTRAINT [TradingOrders_filledQuantity_df] DEFAULT 0,
    [totalFees] DECIMAL(30,10),
    [feeCurrency] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL,
    [exchangeOrderId] NVARCHAR(1000),
    [clientOrderId] NVARCHAR(1000),
    [portfolioId] NVARCHAR(1000),
    [isPaperTrade] BIT NOT NULL CONSTRAINT [TradingOrders_isPaperTrade_df] DEFAULT 1,
    [rejectionReason] NVARCHAR(1000),
    [cancelledAt] DATETIME2,
    [executedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TradingOrders_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [TradingOrders_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [TradingOrders_clientOrderId_key] UNIQUE NONCLUSTERED ([clientOrderId])
);

-- CreateTable
CREATE TABLE [dbo].[TradeFills] (
    [id] NVARCHAR(1000) NOT NULL,
    [tradingOrderId] NVARCHAR(1000) NOT NULL,
    [exchangeTradeId] NVARCHAR(1000),
    [price] DECIMAL(30,10) NOT NULL,
    [quantity] DECIMAL(30,10) NOT NULL,
    [feeAmount] DECIMAL(30,10) NOT NULL,
    [feeCurrency] NVARCHAR(1000) NOT NULL,
    [executedAt] DATETIME2 NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TradeFills_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [TradeFills_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[UserSettings] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [preferredCurrency] NVARCHAR(1000) NOT NULL CONSTRAINT [UserSettings_preferredCurrency_df] DEFAULT 'INR',
    [preferredExchangeId] NVARCHAR(1000),
    [preferredTradingPairId] NVARCHAR(1000),
    [maximumBuyPrice] DECIMAL(30,10),
    [minimumSellPrice] DECIMAL(30,10),
    [maximumAllowedGapPct] DECIMAL(10,6) NOT NULL CONSTRAINT [UserSettings_maximumAllowedGapPct_df] DEFAULT 2.0,
    [enablePriceAlerts] BIT NOT NULL CONSTRAINT [UserSettings_enablePriceAlerts_df] DEFAULT 1,
    [enableEmailAlerts] BIT NOT NULL CONSTRAINT [UserSettings_enableEmailAlerts_df] DEFAULT 0,
    [enablePaperTrading] BIT NOT NULL CONSTRAINT [UserSettings_enablePaperTrading_df] DEFAULT 1,
    [defaultOrderQuantity] DECIMAL(30,10),
    [theme] NVARCHAR(1000) NOT NULL CONSTRAINT [UserSettings_theme_df] DEFAULT 'dark',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [UserSettings_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [UserSettings_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UserSettings_userId_key] UNIQUE NONCLUSTERED ([userId])
);

-- CreateTable
CREATE TABLE [dbo].[Alerts] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [alertType] NVARCHAR(1000) NOT NULL,
    [exchangeId] NVARCHAR(1000),
    [tradingPairId] NVARCHAR(1000),
    [message] NVARCHAR(1000) NOT NULL,
    [severity] NVARCHAR(1000) NOT NULL CONSTRAINT [Alerts_severity_df] DEFAULT 'INFO',
    [isRead] BIT NOT NULL CONSTRAINT [Alerts_isRead_df] DEFAULT 0,
    [isEnabled] BIT NOT NULL CONSTRAINT [Alerts_isEnabled_df] DEFAULT 1,
    [triggerValue] DECIMAL(30,10),
    [thresholdValue] DECIMAL(30,10),
    [cooldownSeconds] INT NOT NULL CONSTRAINT [Alerts_cooldownSeconds_df] DEFAULT 300,
    [lastTriggeredAt] DATETIME2,
    [triggeredCount] INT NOT NULL CONSTRAINT [Alerts_triggeredCount_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Alerts_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Alerts_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ExchangeCredentials] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [exchangeId] NVARCHAR(1000) NOT NULL,
    [label] NVARCHAR(1000) NOT NULL,
    [encryptedApiKey] TEXT NOT NULL,
    [encryptedApiSecret] TEXT NOT NULL,
    [keyIv] NVARCHAR(1000) NOT NULL,
    [permissions] NVARCHAR(1000) NOT NULL CONSTRAINT [ExchangeCredentials_permissions_df] DEFAULT 'READ_ONLY',
    [isActive] BIT NOT NULL CONSTRAINT [ExchangeCredentials_isActive_df] DEFAULT 1,
    [lastVerifiedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ExchangeCredentials_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ExchangeCredentials_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ExchangeCredentials_userId_exchangeId_label_key] UNIQUE NONCLUSTERED ([userId],[exchangeId],[label])
);

-- CreateTable
CREATE TABLE [dbo].[AuditLogs] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000),
    [action] NVARCHAR(1000) NOT NULL,
    [entityType] NVARCHAR(1000),
    [entityId] NVARCHAR(1000),
    [metadata] TEXT,
    [ipAddress] NVARCHAR(1000),
    [userAgent] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AuditLogs_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AuditLogs_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Instruments] (
    [id] NVARCHAR(1000) NOT NULL,
    [symbol] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [category] NVARCHAR(1000) NOT NULL,
    [subCategory] NVARCHAR(1000),
    [currency] NVARCHAR(1000) NOT NULL CONSTRAINT [Instruments_currency_df] DEFAULT 'INR',
    [tickSize] DECIMAL(30,10) NOT NULL,
    [lotSize] DECIMAL(30,10) NOT NULL CONSTRAINT [Instruments_lotSize_df] DEFAULT 1,
    [unit] NVARCHAR(1000) NOT NULL,
    [tradingHours] NVARCHAR(1000),
    [isEnabled] BIT NOT NULL CONSTRAINT [Instruments_isEnabled_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Instruments_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Instruments_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Instruments_symbol_key] UNIQUE NONCLUSTERED ([symbol])
);

-- CreateTable
CREATE TABLE [dbo].[CommodityContracts] (
    [id] NVARCHAR(1000) NOT NULL,
    [instrumentId] NVARCHAR(1000) NOT NULL,
    [contractSymbol] NVARCHAR(1000) NOT NULL,
    [contractName] NVARCHAR(1000) NOT NULL,
    [category] NVARCHAR(1000) NOT NULL,
    [expiryDate] DATETIME2 NOT NULL,
    [tenderStartDate] DATETIME2,
    [deliveryType] NVARCHAR(1000) NOT NULL CONSTRAINT [CommodityContracts_deliveryType_df] DEFAULT 'PHYSICAL',
    [lotSize] DECIMAL(30,10) NOT NULL,
    [tickSize] DECIMAL(30,10) NOT NULL,
    [openInterest] DECIMAL(30,10) NOT NULL CONSTRAINT [CommodityContracts_openInterest_df] DEFAULT 0,
    [lastTradedPrice] DECIMAL(30,10) NOT NULL,
    [isLive] BIT NOT NULL CONSTRAINT [CommodityContracts_isLive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [CommodityContracts_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [CommodityContracts_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [CommodityContracts_contractSymbol_key] UNIQUE NONCLUSTERED ([contractSymbol])
);

-- CreateTable
CREATE TABLE [dbo].[OptionContracts] (
    [id] NVARCHAR(1000) NOT NULL,
    [instrumentId] NVARCHAR(1000) NOT NULL,
    [symbol] NVARCHAR(1000) NOT NULL,
    [underlying] NVARCHAR(1000) NOT NULL,
    [category] NVARCHAR(1000) NOT NULL,
    [optionType] NVARCHAR(1000) NOT NULL,
    [strikePrice] DECIMAL(30,10) NOT NULL,
    [expiryDate] DATETIME2 NOT NULL,
    [lotSize] DECIMAL(30,10) NOT NULL CONSTRAINT [OptionContracts_lotSize_df] DEFAULT 1,
    [impliedVolatility] DECIMAL(10,6) NOT NULL CONSTRAINT [OptionContracts_impliedVolatility_df] DEFAULT 0,
    [lastTradedPrice] DECIMAL(30,10) NOT NULL CONSTRAINT [OptionContracts_lastTradedPrice_df] DEFAULT 0,
    [bestBid] DECIMAL(30,10) NOT NULL CONSTRAINT [OptionContracts_bestBid_df] DEFAULT 0,
    [bestAsk] DECIMAL(30,10) NOT NULL CONSTRAINT [OptionContracts_bestAsk_df] DEFAULT 0,
    [volume] DECIMAL(30,10) NOT NULL CONSTRAINT [OptionContracts_volume_df] DEFAULT 0,
    [openInterest] DECIMAL(30,10) NOT NULL CONSTRAINT [OptionContracts_openInterest_df] DEFAULT 0,
    [isLive] BIT NOT NULL CONSTRAINT [OptionContracts_isLive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [OptionContracts_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [OptionContracts_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [OptionContracts_symbol_key] UNIQUE NONCLUSTERED ([symbol])
);

-- CreateTable
CREATE TABLE [dbo].[Portfolios] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [category] NVARCHAR(1000) NOT NULL,
    [currency] NVARCHAR(1000) NOT NULL CONSTRAINT [Portfolios_currency_df] DEFAULT 'INR',
    [initialCapital] DECIMAL(30,10) NOT NULL,
    [totalCapital] DECIMAL(30,10) NOT NULL,
    [allocatedCapital] DECIMAL(30,10) NOT NULL CONSTRAINT [Portfolios_allocatedCapital_df] DEFAULT 0,
    [availableBalance] DECIMAL(30,10) NOT NULL,
    [investedAmount] DECIMAL(30,10) NOT NULL CONSTRAINT [Portfolios_investedAmount_df] DEFAULT 0,
    [currentMarketValue] DECIMAL(30,10) NOT NULL CONSTRAINT [Portfolios_currentMarketValue_df] DEFAULT 0,
    [realizedPnL] DECIMAL(30,10) NOT NULL CONSTRAINT [Portfolios_realizedPnL_df] DEFAULT 0,
    [unrealizedPnL] DECIMAL(30,10) NOT NULL CONSTRAINT [Portfolios_unrealizedPnL_df] DEFAULT 0,
    [totalCharges] DECIMAL(30,10) NOT NULL CONSTRAINT [Portfolios_totalCharges_df] DEFAULT 0,
    [maxInvestmentLimit] DECIMAL(30,10) NOT NULL,
    [riskLimitPercentage] DECIMAL(10,6) NOT NULL CONSTRAINT [Portfolios_riskLimitPercentage_df] DEFAULT 5.0,
    [maxDailyLoss] DECIMAL(30,10) NOT NULL CONSTRAINT [Portfolios_maxDailyLoss_df] DEFAULT 10000,
    [reviewDate] DATETIME2,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Portfolios_status_df] DEFAULT 'READY',
    [executionMode] NVARCHAR(1000) NOT NULL CONSTRAINT [Portfolios_executionMode_df] DEFAULT 'PAPER',
    [connectedBrokerId] NVARCHAR(1000),
    [isArchived] BIT NOT NULL CONSTRAINT [Portfolios_isArchived_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Portfolios_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Portfolios_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[PortfolioAssets] (
    [id] NVARCHAR(1000) NOT NULL,
    [portfolioId] NVARCHAR(1000) NOT NULL,
    [instrumentId] NVARCHAR(1000) NOT NULL,
    [targetAllocationPct] DECIMAL(10,6) NOT NULL,
    [currentValue] DECIMAL(30,10) NOT NULL CONSTRAINT [PortfolioAssets_currentValue_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [PortfolioAssets_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [PortfolioAssets_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [PortfolioAssets_portfolioId_instrumentId_key] UNIQUE NONCLUSTERED ([portfolioId],[instrumentId])
);

-- CreateTable
CREATE TABLE [dbo].[PortfolioPositions] (
    [id] NVARCHAR(1000) NOT NULL,
    [portfolioId] NVARCHAR(1000) NOT NULL,
    [instrumentId] NVARCHAR(1000) NOT NULL,
    [symbol] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [category] NVARCHAR(1000) NOT NULL,
    [side] NVARCHAR(1000) NOT NULL,
    [optionType] NVARCHAR(1000),
    [strikePrice] DECIMAL(30,10),
    [expiryDate] DATETIME2,
    [quantity] DECIMAL(30,10) NOT NULL,
    [entryPrice] DECIMAL(30,10) NOT NULL,
    [currentPrice] DECIMAL(30,10) NOT NULL,
    [investedAmount] DECIMAL(30,10) NOT NULL,
    [currentMarketValue] DECIMAL(30,10) NOT NULL,
    [unrealizedPnL] DECIMAL(30,10) NOT NULL,
    [unrealizedPnLPct] DECIMAL(10,6) NOT NULL,
    [realizedPnL] DECIMAL(30,10) NOT NULL CONSTRAINT [PortfolioPositions_realizedPnL_df] DEFAULT 0,
    [stopLossPrice] DECIMAL(30,10),
    [targetPrice] DECIMAL(30,10),
    [totalCharges] DECIMAL(30,10) NOT NULL CONSTRAINT [PortfolioPositions_totalCharges_df] DEFAULT 0,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [PortfolioPositions_status_df] DEFAULT 'OPEN',
    [openedAt] DATETIME2 NOT NULL CONSTRAINT [PortfolioPositions_openedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [closedAt] DATETIME2,
    [lastUpdatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [PortfolioPositions_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[PortfolioHistory] (
    [id] NVARCHAR(1000) NOT NULL,
    [portfolioId] NVARCHAR(1000) NOT NULL,
    [timestamp] DATETIME2 NOT NULL CONSTRAINT [PortfolioHistory_timestamp_df] DEFAULT CURRENT_TIMESTAMP,
    [totalCapital] DECIMAL(30,10) NOT NULL,
    [investedAmount] DECIMAL(30,10) NOT NULL,
    [realizedPnL] DECIMAL(30,10) NOT NULL,
    [unrealizedPnL] DECIMAL(30,10) NOT NULL,
    [totalReturnPct] DECIMAL(10,6) NOT NULL,
    CONSTRAINT [PortfolioHistory_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[BrokerConnections] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [brokerType] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000) NOT NULL,
    [accountUserId] NVARCHAR(1000) NOT NULL,
    [encryptedApiKey] TEXT NOT NULL,
    [encryptedApiSecret] TEXT NOT NULL,
    [encryptedAccessToken] TEXT,
    [keyIv] NVARCHAR(1000) NOT NULL,
    [isConnected] BIT NOT NULL CONSTRAINT [BrokerConnections_isConnected_df] DEFAULT 1,
    [isLiveTradingAuthorized] BIT NOT NULL CONSTRAINT [BrokerConnections_isLiveTradingAuthorized_df] DEFAULT 0,
    [lastSyncAt] DATETIME2,
    [supportedSegments] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [BrokerConnections_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [BrokerConnections_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [BrokerConnections_userId_brokerType_accountUserId_key] UNIQUE NONCLUSTERED ([userId],[brokerType],[accountUserId])
);

-- CreateTable
CREATE TABLE [dbo].[ExpiryNotifications] (
    [id] NVARCHAR(1000) NOT NULL,
    [symbol] NVARCHAR(1000) NOT NULL,
    [contractName] NVARCHAR(1000) NOT NULL,
    [expiryDate] DATETIME2 NOT NULL,
    [noticeType] NVARCHAR(1000) NOT NULL,
    [message] NVARCHAR(1000) NOT NULL,
    [isRead] BIT NOT NULL CONSTRAINT [ExpiryNotifications_isRead_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ExpiryNotifications_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ExpiryNotifications_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PasswordResetTokens_userId_idx] ON [dbo].[PasswordResetTokens]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PasswordResetTokens_tokenHash_idx] ON [dbo].[PasswordResetTokens]([tokenHash]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TradingPairs_exchangeId_idx] ON [dbo].[TradingPairs]([exchangeId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [MarketSnapshots_exchangeId_tradingPairId_createdAt_idx] ON [dbo].[MarketSnapshots]([exchangeId], [tradingPairId], [createdAt] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [MarketSnapshots_tradingPairId_createdAt_idx] ON [dbo].[MarketSnapshots]([tradingPairId], [createdAt] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [OrderBookLevels_exchangeId_tradingPairId_side_snapshotTimestamp_idx] ON [dbo].[OrderBookLevels]([exchangeId], [tradingPairId], [side], [snapshotTimestamp] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PriceGapEvents_userId_createdAt_idx] ON [dbo].[PriceGapEvents]([userId], [createdAt] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PriceGapEvents_exchangeId_tradingPairId_createdAt_idx] ON [dbo].[PriceGapEvents]([exchangeId], [tradingPairId], [createdAt] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LatencyMetrics_exchangeId_tradingPairId_createdAt_idx] ON [dbo].[LatencyMetrics]([exchangeId], [tradingPairId], [createdAt] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LatencyMetrics_metricType_createdAt_idx] ON [dbo].[LatencyMetrics]([metricType], [createdAt] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TradingOrders_userId_createdAt_idx] ON [dbo].[TradingOrders]([userId], [createdAt] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TradingOrders_portfolioId_idx] ON [dbo].[TradingOrders]([portfolioId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TradingOrders_status_createdAt_idx] ON [dbo].[TradingOrders]([status], [createdAt] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TradeFills_tradingOrderId_idx] ON [dbo].[TradeFills]([tradingOrderId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Alerts_userId_isRead_createdAt_idx] ON [dbo].[Alerts]([userId], [isRead], [createdAt] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Alerts_alertType_createdAt_idx] ON [dbo].[Alerts]([alertType], [createdAt] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLogs_userId_createdAt_idx] ON [dbo].[AuditLogs]([userId], [createdAt] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLogs_action_createdAt_idx] ON [dbo].[AuditLogs]([action], [createdAt] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [CommodityContracts_category_expiryDate_idx] ON [dbo].[CommodityContracts]([category], [expiryDate]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [OptionContracts_underlying_expiryDate_strikePrice_idx] ON [dbo].[OptionContracts]([underlying], [expiryDate], [strikePrice]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Portfolios_userId_status_idx] ON [dbo].[Portfolios]([userId], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PortfolioPositions_portfolioId_status_idx] ON [dbo].[PortfolioPositions]([portfolioId], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PortfolioHistory_portfolioId_timestamp_idx] ON [dbo].[PortfolioHistory]([portfolioId], [timestamp] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ExpiryNotifications_expiryDate_idx] ON [dbo].[ExpiryNotifications]([expiryDate]);

-- AddForeignKey
ALTER TABLE [dbo].[PasswordResetTokens] ADD CONSTRAINT [PasswordResetTokens_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[Users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Accounts] ADD CONSTRAINT [Accounts_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[Users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Sessions] ADD CONSTRAINT [Sessions_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[Users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TradingPairs] ADD CONSTRAINT [TradingPairs_exchangeId_fkey] FOREIGN KEY ([exchangeId]) REFERENCES [dbo].[Exchanges]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[MarketSnapshots] ADD CONSTRAINT [MarketSnapshots_exchangeId_fkey] FOREIGN KEY ([exchangeId]) REFERENCES [dbo].[Exchanges]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MarketSnapshots] ADD CONSTRAINT [MarketSnapshots_tradingPairId_fkey] FOREIGN KEY ([tradingPairId]) REFERENCES [dbo].[TradingPairs]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[OrderBookLevels] ADD CONSTRAINT [OrderBookLevels_exchangeId_fkey] FOREIGN KEY ([exchangeId]) REFERENCES [dbo].[Exchanges]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[OrderBookLevels] ADD CONSTRAINT [OrderBookLevels_tradingPairId_fkey] FOREIGN KEY ([tradingPairId]) REFERENCES [dbo].[TradingPairs]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PriceGapEvents] ADD CONSTRAINT [PriceGapEvents_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[Users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PriceGapEvents] ADD CONSTRAINT [PriceGapEvents_exchangeId_fkey] FOREIGN KEY ([exchangeId]) REFERENCES [dbo].[Exchanges]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PriceGapEvents] ADD CONSTRAINT [PriceGapEvents_tradingPairId_fkey] FOREIGN KEY ([tradingPairId]) REFERENCES [dbo].[TradingPairs]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[LatencyMetrics] ADD CONSTRAINT [LatencyMetrics_exchangeId_fkey] FOREIGN KEY ([exchangeId]) REFERENCES [dbo].[Exchanges]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[LatencyMetrics] ADD CONSTRAINT [LatencyMetrics_tradingPairId_fkey] FOREIGN KEY ([tradingPairId]) REFERENCES [dbo].[TradingPairs]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TradingOrders] ADD CONSTRAINT [TradingOrders_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[Users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TradingOrders] ADD CONSTRAINT [TradingOrders_exchangeId_fkey] FOREIGN KEY ([exchangeId]) REFERENCES [dbo].[Exchanges]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TradingOrders] ADD CONSTRAINT [TradingOrders_tradingPairId_fkey] FOREIGN KEY ([tradingPairId]) REFERENCES [dbo].[TradingPairs]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TradingOrders] ADD CONSTRAINT [TradingOrders_portfolioId_fkey] FOREIGN KEY ([portfolioId]) REFERENCES [dbo].[Portfolios]([id]) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TradeFills] ADD CONSTRAINT [TradeFills_tradingOrderId_fkey] FOREIGN KEY ([tradingOrderId]) REFERENCES [dbo].[TradingOrders]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[UserSettings] ADD CONSTRAINT [UserSettings_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[Users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Alerts] ADD CONSTRAINT [Alerts_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[Users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ExchangeCredentials] ADD CONSTRAINT [ExchangeCredentials_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[Users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ExchangeCredentials] ADD CONSTRAINT [ExchangeCredentials_exchangeId_fkey] FOREIGN KEY ([exchangeId]) REFERENCES [dbo].[Exchanges]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[AuditLogs] ADD CONSTRAINT [AuditLogs_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[Users]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[CommodityContracts] ADD CONSTRAINT [CommodityContracts_instrumentId_fkey] FOREIGN KEY ([instrumentId]) REFERENCES [dbo].[Instruments]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[OptionContracts] ADD CONSTRAINT [OptionContracts_instrumentId_fkey] FOREIGN KEY ([instrumentId]) REFERENCES [dbo].[Instruments]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Portfolios] ADD CONSTRAINT [Portfolios_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[Users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Portfolios] ADD CONSTRAINT [Portfolios_connectedBrokerId_fkey] FOREIGN KEY ([connectedBrokerId]) REFERENCES [dbo].[BrokerConnections]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PortfolioAssets] ADD CONSTRAINT [PortfolioAssets_portfolioId_fkey] FOREIGN KEY ([portfolioId]) REFERENCES [dbo].[Portfolios]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[PortfolioAssets] ADD CONSTRAINT [PortfolioAssets_instrumentId_fkey] FOREIGN KEY ([instrumentId]) REFERENCES [dbo].[Instruments]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PortfolioPositions] ADD CONSTRAINT [PortfolioPositions_portfolioId_fkey] FOREIGN KEY ([portfolioId]) REFERENCES [dbo].[Portfolios]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[PortfolioPositions] ADD CONSTRAINT [PortfolioPositions_instrumentId_fkey] FOREIGN KEY ([instrumentId]) REFERENCES [dbo].[Instruments]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PortfolioHistory] ADD CONSTRAINT [PortfolioHistory_portfolioId_fkey] FOREIGN KEY ([portfolioId]) REFERENCES [dbo].[Portfolios]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[BrokerConnections] ADD CONSTRAINT [BrokerConnections_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[Users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH


-- =====================================================================
-- TrackingCrypt: Seed Default Exchanges, Trading Pairs, and Users
-- =====================================================================
USE [TrackingCrypt];
GO

-- 1. Default Exchanges
IF NOT EXISTS (SELECT 1 FROM [Exchanges] WHERE [id] = 'mock')
BEGIN
    INSERT INTO [Exchanges] ([id], [name], [displayName], [baseApiUrl], [wsUrl], [isEnabled], [isMock], [createdAt], [updatedAt])
    VALUES ('mock', 'mock', 'Mock Exchange (Dev)', 'http://localhost:3000/api', NULL, 1, 1, GETUTCDATE(), GETUTCDATE());
END;

IF NOT EXISTS (SELECT 1 FROM [Exchanges] WHERE [id] = 'binance')
BEGIN
    INSERT INTO [Exchanges] ([id], [name], [displayName], [baseApiUrl], [wsUrl], [isEnabled], [isMock], [createdAt], [updatedAt])
    VALUES ('binance', 'binance', 'Binance', 'https://api.binance.com', 'wss://stream.binance.com:9443', 1, 0, GETUTCDATE(), GETUTCDATE());
END;
GO

-- 2. Trading Pairs
IF NOT EXISTS (SELECT 1 FROM [TradingPairs] WHERE [exchangeId] = 'mock' AND [symbol] = 'BTCINR')
BEGIN
    INSERT INTO [TradingPairs] ([id], [exchangeId], [symbol], [baseCurrency], [quoteCurrency], [isEnabled], [minQuantity], [maxQuantity], [tickSize], [stepSize], [createdAt])
    VALUES 
    ('pair_btcinr', 'mock', 'BTCINR', 'BTC', 'INR', 1, 0.0001, 100.0, 0.01, 0.0001, GETUTCDATE()),
    ('pair_ethinr', 'mock', 'ETHINR', 'ETH', 'INR', 1, 0.001, 1000.0, 0.01, 0.001, GETUTCDATE()),
    ('pair_bnbinr', 'mock', 'BNBINR', 'BNB', 'INR', 1, 0.01, 5000.0, 0.01, 0.01, GETUTCDATE()),
    ('pair_usdtinr', 'mock', 'USDTINR', 'USDT', 'INR', 1, 1.0, 1000000.0, 0.01, 1.0, GETUTCDATE()),
    ('pair_btcusdt', 'binance', 'BTCUSDT', 'BTC', 'USDT', 1, 0.00001, 100.0, 0.01, 0.00001, GETUTCDATE()),
    ('pair_ethusdt', 'binance', 'ETHUSDT', 'ETH', 'USDT', 1, 0.0001, 1000.0, 0.01, 0.0001, GETUTCDATE());
END;
GO

-- 3. Default Users
-- Admin: admin@trackingcrypt.com / Admin@123456
IF NOT EXISTS (SELECT 1 FROM [Users] WHERE [email] = 'admin@trackingcrypt.com')
BEGIN
    INSERT INTO [Users] ([id], [name], [email], [passwordHash], [role], [isActive], [createdAt], [updatedAt])
    VALUES ('usr_admin_root_01', 'System Administrator', 'admin@trackingcrypt.com', '$2b$10$MKS9qCOKUf0LcdhzAPx5MuJOdEnaiiv/4U64es.rtbyTtKozd5dOG', 'ADMIN', 1, GETUTCDATE(), GETUTCDATE());

    INSERT INTO [UserSettings] ([id], [userId], [preferredCurrency], [theme], [enablePaperTrading], [enablePriceAlerts], [enableEmailAlerts], [maximumAllowedGapPct], [createdAt], [updatedAt])
    VALUES ('set_admin_01', 'usr_admin_root_01', 'INR', 'dark', 1, 1, 0, 2.0, GETUTCDATE(), GETUTCDATE());
END;

-- Developer: dev@trackingcrypt.local / DevPassword123!
IF NOT EXISTS (SELECT 1 FROM [Users] WHERE [email] = 'dev@trackingcrypt.local')
BEGIN
    INSERT INTO [Users] ([id], [name], [email], [passwordHash], [role], [isActive], [createdAt], [updatedAt])
    VALUES ('usr_dev_local_01', 'Developer Account', 'dev@trackingcrypt.local', '$2b$10$JpfhsVCslrPJu5m2obj/3e1bLixzyfuLKqxGCgTdpQ/6H1zgvnGQG', 'ADMIN', 1, GETUTCDATE(), GETUTCDATE());

    INSERT INTO [UserSettings] ([id], [userId], [preferredCurrency], [theme], [enablePaperTrading], [enablePriceAlerts], [enableEmailAlerts], [maximumAllowedGapPct], [createdAt], [updatedAt])
    VALUES ('set_dev_01', 'usr_dev_local_01', 'INR', 'dark', 1, 1, 0, 2.0, GETUTCDATE(), GETUTCDATE());
END;

-- Standard Trader: user@trackingcrypt.com / User@123456
IF NOT EXISTS (SELECT 1 FROM [Users] WHERE [email] = 'user@trackingcrypt.com')
BEGIN
    INSERT INTO [Users] ([id], [name], [email], [passwordHash], [role], [isActive], [createdAt], [updatedAt])
    VALUES ('usr_trader_demo_01', 'Standard Trader', 'user@trackingcrypt.com', '$2b$10$EqSFVS4opfuIkOX.MFxLX.rhTdQLe0b2/FbwHeUGkNsVRt9OdWCM2', 'USER', 1, GETUTCDATE(), GETUTCDATE());

    INSERT INTO [UserSettings] ([id], [userId], [preferredCurrency], [theme], [enablePaperTrading], [enablePriceAlerts], [enableEmailAlerts], [maximumAllowedGapPct], [createdAt], [updatedAt])
    VALUES ('set_trader_01', 'usr_trader_demo_01', 'INR', 'dark', 1, 1, 0, 2.0, GETUTCDATE(), GETUTCDATE());
END;
GO

SELECT 
    (SELECT COUNT(*) FROM [Users]) AS TotalUsers,
    (SELECT COUNT(*) FROM [Exchanges]) AS TotalExchanges,
    (SELECT COUNT(*) FROM [TradingPairs]) AS TotalTradingPairs;
GO
