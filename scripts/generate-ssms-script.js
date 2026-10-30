const fs = require('fs');

const header = `-- =========================================================================================
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
`;

let ddl = fs.readFileSync('prisma/setup_trackingcrypt.sql', 'utf8');
let seed = fs.readFileSync('prisma/seed.sql', 'utf8');

// Strip UTF-8 BOM if present
ddl = ddl.replace(/^\uFEFF/, '');
seed = seed.replace(/^\uFEFF/, '');

const complete = header + '\n' + ddl + '\n' + seed;
fs.writeFileSync('prisma/SSMS_SETUP_TRACKINGCRYPT.sql', complete, 'utf8');
console.log('✅ Master SSMS script generated without BOM: prisma/SSMS_SETUP_TRACKINGCRYPT.sql');
