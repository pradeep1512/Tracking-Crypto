-- ============================================================================
-- TrackingCrypt: Incremental Database Migration for Wallet, Payments & Exchanges
-- Target Database: TrackingCrypt (Microsoft SQL Server 2022/2025)
-- Safe, Idempotent, Production-Ready Script
-- ============================================================================

USE [TrackingCrypt];
GO

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

PRINT 'Starting TrackingCrypt Wallet, Payments & Exchange Tables Migration...';
GO

-- 1. Alter [BrokerConnections] if needed
IF COL_LENGTH('dbo.BrokerConnections', 'permissions') IS NULL
BEGIN
    ALTER TABLE [dbo].[BrokerConnections] ADD [permissions] NVARCHAR(50) NOT NULL CONSTRAINT [DF_BrokerConnections_permissions] DEFAULT 'TRADE';
    PRINT 'Added column [permissions] to [BrokerConnections].';
END
GO

IF COL_LENGTH('dbo.BrokerConnections', 'connectionStatus') IS NULL
BEGIN
    ALTER TABLE [dbo].[BrokerConnections] ADD [connectionStatus] NVARCHAR(50) NOT NULL CONSTRAINT [DF_BrokerConnections_connectionStatus] DEFAULT 'CONNECTED';
    PRINT 'Added column [connectionStatus] to [BrokerConnections].';
END
GO

IF COL_LENGTH('dbo.BrokerConnections', 'lastVerifiedAt') IS NULL
BEGIN
    ALTER TABLE [dbo].[BrokerConnections] ADD [lastVerifiedAt] DATETIME2(7) NULL;
    PRINT 'Added column [lastVerifiedAt] to [BrokerConnections].';
END
GO

-- 2. Alter [TradingOrders] if needed
IF COL_LENGTH('dbo.TradingOrders', 'brokerConnectionId') IS NULL
BEGIN
    ALTER TABLE [dbo].[TradingOrders] ADD [brokerConnectionId] NVARCHAR(1000) NULL;
    PRINT 'Added column [brokerConnectionId] to [TradingOrders].';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_TradingOrders_BrokerConnection')
BEGIN
    ALTER TABLE [dbo].[TradingOrders] 
    ADD CONSTRAINT [FK_TradingOrders_BrokerConnection] 
    FOREIGN KEY ([brokerConnectionId]) REFERENCES [dbo].[BrokerConnections]([id]) 
    ON DELETE SET NULL;
    PRINT 'Added Foreign Key [FK_TradingOrders_BrokerConnection].';
END
GO

-- 3. Create Table [Wallets]
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Wallets')
BEGIN
    CREATE TABLE [dbo].[Wallets] (
        [id] NVARCHAR(1000) NOT NULL,
        [userId] NVARCHAR(1000) NOT NULL,
        [currencyCode] NVARCHAR(10) NOT NULL CONSTRAINT [DF_Wallets_currencyCode] DEFAULT 'INR',
        [availableBalance] DECIMAL(30, 10) NOT NULL CONSTRAINT [DF_Wallets_availableBalance] DEFAULT 0,
        [reservedBalance] DECIMAL(30, 10) NOT NULL CONSTRAINT [DF_Wallets_reservedBalance] DEFAULT 0,
        [totalDeposits] DECIMAL(30, 10) NOT NULL CONSTRAINT [DF_Wallets_totalDeposits] DEFAULT 0,
        [totalTradingCharges] DECIMAL(30, 10) NOT NULL CONSTRAINT [DF_Wallets_totalTradingCharges] DEFAULT 0,
        [createdAt] DATETIME2(7) NOT NULL CONSTRAINT [DF_Wallets_createdAt] DEFAULT SYSDATETIME(),
        [updatedAt] DATETIME2(7) NOT NULL CONSTRAINT [DF_Wallets_updatedAt] DEFAULT SYSDATETIME(),

        CONSTRAINT [PK_Wallets] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [UQ_Wallets_userId] UNIQUE ([userId]),
        CONSTRAINT [FK_Wallets_User] FOREIGN KEY ([userId]) REFERENCES [dbo].[Users]([id]) ON DELETE CASCADE
    );
    CREATE NONCLUSTERED INDEX [IX_Wallets_userId] ON [dbo].[Wallets]([userId]);
    PRINT 'Created Table [Wallets].';
END
GO

-- 4. Create Table [WalletTransactions]
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'WalletTransactions')
BEGIN
    CREATE TABLE [dbo].[WalletTransactions] (
        [id] NVARCHAR(1000) NOT NULL,
        [walletId] NVARCHAR(1000) NOT NULL,
        [transactionType] NVARCHAR(50) NOT NULL,
        [amount] DECIMAL(30, 10) NOT NULL,
        [currencyCode] NVARCHAR(10) NOT NULL CONSTRAINT [DF_WalletTx_currencyCode] DEFAULT 'INR',
        [paymentMethod] NVARCHAR(50) NULL,
        [gatewayReference] NVARCHAR(255) NULL,
        [referenceId] NVARCHAR(255) NULL,
        [status] NVARCHAR(50) NOT NULL,
        [description] NVARCHAR(1000) NULL,
        [metadata] NVARCHAR(MAX) NULL,
        [createdAt] DATETIME2(7) NOT NULL CONSTRAINT [DF_WalletTx_createdAt] DEFAULT SYSDATETIME(),

        CONSTRAINT [PK_WalletTransactions] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [FK_WalletTransactions_Wallet] FOREIGN KEY ([walletId]) REFERENCES [dbo].[Wallets]([id]) ON DELETE CASCADE
    );
    CREATE NONCLUSTERED INDEX [IX_WalletTransactions_walletId_createdAt] ON [dbo].[WalletTransactions]([walletId], [createdAt] DESC);
    CREATE NONCLUSTERED INDEX [IX_WalletTransactions_referenceId] ON [dbo].[WalletTransactions]([referenceId]);
    PRINT 'Created Table [WalletTransactions].';
END
GO

-- 5. Create Table [PaymentOrders]
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PaymentOrders')
BEGIN
    CREATE TABLE [dbo].[PaymentOrders] (
        [id] NVARCHAR(1000) NOT NULL,
        [userId] NVARCHAR(1000) NOT NULL,
        [gatewayName] NVARCHAR(50) NOT NULL,
        [gatewayOrderId] NVARCHAR(255) NULL,
        [gatewayPaymentId] NVARCHAR(255) NULL,
        [gatewaySignature] NVARCHAR(500) NULL,
        [amount] DECIMAL(30, 10) NOT NULL,
        [currencyCode] NVARCHAR(10) NOT NULL CONSTRAINT [DF_PaymentOrders_currencyCode] DEFAULT 'INR',
        [status] NVARCHAR(50) NOT NULL,
        [idempotencyKey] NVARCHAR(255) NOT NULL,
        [metadata] NVARCHAR(MAX) NULL,
        [createdAt] DATETIME2(7) NOT NULL CONSTRAINT [DF_PaymentOrders_createdAt] DEFAULT SYSDATETIME(),
        [updatedAt] DATETIME2(7) NOT NULL CONSTRAINT [DF_PaymentOrders_updatedAt] DEFAULT SYSDATETIME(),

        CONSTRAINT [PK_PaymentOrders] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [UQ_PaymentOrders_idempotencyKey] UNIQUE ([idempotencyKey]),
        CONSTRAINT [FK_PaymentOrders_User] FOREIGN KEY ([userId]) REFERENCES [dbo].[Users]([id]) ON DELETE NO ACTION
    );
    CREATE NONCLUSTERED INDEX [IX_PaymentOrders_userId_status] ON [dbo].[PaymentOrders]([userId], [status]);
    CREATE NONCLUSTERED INDEX [IX_PaymentOrders_gatewayOrderId] ON [dbo].[PaymentOrders]([gatewayOrderId]);
    PRINT 'Created Table [PaymentOrders].';
END
GO

-- 6. Create Table [ExchangeBalances]
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ExchangeBalances')
BEGIN
    CREATE TABLE [dbo].[ExchangeBalances] (
        [id] NVARCHAR(1000) NOT NULL,
        [brokerConnectionId] NVARCHAR(1000) NOT NULL,
        [asset] NVARCHAR(50) NOT NULL,
        [availableBalance] DECIMAL(30, 10) NOT NULL CONSTRAINT [DF_ExchangeBalances_availableBalance] DEFAULT 0,
        [reservedBalance] DECIMAL(30, 10) NOT NULL CONSTRAINT [DF_ExchangeBalances_reservedBalance] DEFAULT 0,
        [totalBalance] DECIMAL(30, 10) NOT NULL CONSTRAINT [DF_ExchangeBalances_totalBalance] DEFAULT 0,
        [inrEquivalent] DECIMAL(30, 10) NULL,
        [updatedAt] DATETIME2(7) NOT NULL CONSTRAINT [DF_ExchangeBalances_updatedAt] DEFAULT SYSDATETIME(),

        CONSTRAINT [PK_ExchangeBalances] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [UQ_ExchangeBalances_broker_asset] UNIQUE ([brokerConnectionId], [asset]),
        CONSTRAINT [FK_ExchangeBalances_BrokerConnection] FOREIGN KEY ([brokerConnectionId]) REFERENCES [dbo].[BrokerConnections]([id]) ON DELETE CASCADE
    );
    CREATE NONCLUSTERED INDEX [IX_ExchangeBalances_brokerConnectionId] ON [dbo].[ExchangeBalances]([brokerConnectionId]);
    PRINT 'Created Table [ExchangeBalances].';
END
GO

-- 7. Create Table [FinancialLedgers] (Immutable Financial Audit Trail)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'FinancialLedgers')
BEGIN
    CREATE TABLE [dbo].[FinancialLedgers] (
        [id] NVARCHAR(1000) NOT NULL,
        [userId] NVARCHAR(1000) NOT NULL,
        [walletId] NVARCHAR(1000) NULL,
        [entryType] NVARCHAR(50) NOT NULL,
        [amount] DECIMAL(30, 10) NOT NULL,
        [currencyCode] NVARCHAR(10) NOT NULL CONSTRAINT [DF_FinancialLedgers_currencyCode] DEFAULT 'INR',
        [runningBalance] DECIMAL(30, 10) NOT NULL,
        [referenceType] NVARCHAR(100) NOT NULL,
        [referenceId] NVARCHAR(255) NOT NULL,
        [idempotencyKey] NVARCHAR(255) NOT NULL,
        [narration] NVARCHAR(1000) NOT NULL,
        [createdAt] DATETIME2(7) NOT NULL CONSTRAINT [DF_FinancialLedgers_createdAt] DEFAULT SYSDATETIME(),

        CONSTRAINT [PK_FinancialLedgers] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [UQ_FinancialLedgers_idempotencyKey] UNIQUE ([idempotencyKey]),
        CONSTRAINT [FK_FinancialLedgers_User] FOREIGN KEY ([userId]) REFERENCES [dbo].[Users]([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_FinancialLedgers_Wallet] FOREIGN KEY ([walletId]) REFERENCES [dbo].[Wallets]([id]) ON DELETE SET NULL
    );
    CREATE NONCLUSTERED INDEX [IX_FinancialLedgers_userId_createdAt] ON [dbo].[FinancialLedgers]([userId], [createdAt] DESC);
    CREATE NONCLUSTERED INDEX [IX_FinancialLedgers_referenceId] ON [dbo].[FinancialLedgers]([referenceId]);
    PRINT 'Created Table [FinancialLedgers].';
END
GO

PRINT 'Wallet, Payments & Exchange Tables Migration Completed Successfully!';
GO
