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
