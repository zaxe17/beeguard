-- BeeGuard backup (auto) of `beeguard`
-- Created 2026-10-16T10:37:30
-- Tables: 22

SET FOREIGN_KEY_CHECKS = 0
-- @@END@@

-- Table `admins`
DROP TABLE IF EXISTS `admins`
-- @@END@@
CREATE TABLE `admins` (
  `adminID` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `admin_name` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact_no` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`adminID`),
  UNIQUE KEY `uq_admins_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `admins` (`adminID`, `admin_name`, `address`, `password`, `contact_no`, `email`, `status`, `created_at`, `updated_at`, `deleted_at`) VALUES
('ADM-000001', 'BeeGuard Admin', 'Bureau of Animal Industry, Quezon City', '$2b$12$uXkaTZ2aBMSPFZsQOSFLw.qou7FZ5f7iAHUJ0CDGDbd0oQkA7n/D.', '9000000000', 'admin@beeguard.com', 'Active', '2026-09-28 02:57:54', NULL, NULL)
-- @@END@@

-- Table `alert_recipients`
DROP TABLE IF EXISTS `alert_recipients`
-- @@END@@
CREATE TABLE `alert_recipients` (
  `recipient_id` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `alert_id` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `beekeeper_id` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `distance_km` decimal(6,2) DEFAULT NULL,
  `risk_level` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notification_id` varchar(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `notified_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`recipient_id`),
  UNIQUE KEY `uq_alert_recipients_alert_beekeeper` (`alert_id`,`beekeeper_id`),
  KEY `idx_alert_recipients_beekeeper` (`beekeeper_id`,`notified_at`),
  KEY `fk_alert_recipients_notification` (`notification_id`),
  CONSTRAINT `fk_alert_recipients_alert` FOREIGN KEY (`alert_id`) REFERENCES `alerts` (`alert_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_alert_recipients_beekeeper` FOREIGN KEY (`beekeeper_id`) REFERENCES `beekeepers` (`beekeeperID`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_alert_recipients_notification` FOREIGN KEY (`notification_id`) REFERENCES `notifications` (`notification_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_alert_recipients_risk_level` CHECK (((`risk_level` is null) or (`risk_level` in (_utf8mb3'Low',_utf8mb3'Medium',_utf8mb3'High'))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `alert_recipients` (`recipient_id`, `alert_id`, `beekeeper_id`, `distance_km`, `risk_level`, `notification_id`, `notified_at`, `created_at`) VALUES
('ARC-000014', 'ALT-000020', 'BKP-000002', 0.01, 'High', 'NT-2610051425318edb23', NULL, '2026-10-05 22:25:31'),
('ARC-000015', 'ALT-000022', 'BKP-000003', 1.98, 'Medium', 'NT-261005142606545cb0', NULL, '2026-10-05 22:26:06'),
('ARC-000016', 'ALT-000022', 'BKP-000002', 0.05, 'High', 'NT-261005142606dcaaa8', NULL, '2026-10-05 22:26:06'),
('ARC-000017', 'ALT-000023', 'BKP-000002', 5.15, 'Low', 'NT-261005142610d6fdcb', NULL, '2026-10-05 22:26:10'),
('ARC-000018', 'ALT-000024', 'BKP-000003', 2.31, 'Low', 'NT-2610051426130e48ae', NULL, '2026-10-05 22:26:13'),
('ARC-000019', 'ALT-000024', 'BKP-000002', 2.99, 'Low', 'NT-261005142613660dfc', NULL, '2026-10-05 22:26:13'),
('ARC-000020', 'ALT-000025', 'BKP-000002', 2.84, 'Low', 'NT-26100514271227f3dd', NULL, '2026-10-05 22:27:12'),
('ARC-000021', 'ALT-000027', 'BKP-000002', 2.92, 'Low', 'NT-2610051511116c4eab', NULL, '2026-10-05 23:11:11')
-- @@END@@

-- Table `alerts`
DROP TABLE IF EXISTS `alerts`
-- @@END@@
CREATE TABLE `alerts` (
  `alert_id` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `adminID` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `beekeeperID` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reported_by_beekeeper_id` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'admin',
  `title` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pesticide_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `application_method` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `affected_area` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `latitude` decimal(10,8) NOT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `scheduled_date` datetime NOT NULL,
  `expiration_date` datetime DEFAULT NULL,
  `danger_radius_km` decimal(5,2) NOT NULL,
  `risk_level` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `approval_status` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Approved',
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `reviewed_by` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rejection_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`alert_id`),
  KEY `fk_alerts_admin` (`adminID`),
  KEY `fk_alerts_beekeeper` (`beekeeperID`),
  KEY `fk_alerts_reported_by_beekeeper` (`reported_by_beekeeper_id`),
  KEY `idx_alerts_approval` (`approval_status`,`scheduled_date`),
  CONSTRAINT `fk_alerts_admin` FOREIGN KEY (`adminID`) REFERENCES `admins` (`adminID`) ON UPDATE CASCADE,
  CONSTRAINT `fk_alerts_beekeeper` FOREIGN KEY (`beekeeperID`) REFERENCES `beekeepers` (`beekeeperID`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_alerts_reported_by_beekeeper` FOREIGN KEY (`reported_by_beekeeper_id`) REFERENCES `beekeepers` (`beekeeperID`) ON UPDATE CASCADE,
  CONSTRAINT `chk_alerts_application_method` CHECK (((`application_method` is null) or (`application_method` in (_utf8mb3'Aerial Spray',_utf8mb3'Ground Spray',_utf8mb3'Fogging',_utf8mb3'Dusting',_utf8mb3'Soil Application')))),
  CONSTRAINT `chk_alerts_approval_status` CHECK ((`approval_status` in (_utf8mb3'Pending',_utf8mb3'Approved',_utf8mb3'Rejected'))),
  CONSTRAINT `chk_alerts_risk_level` CHECK ((`risk_level` in (_utf8mb3'Low',_utf8mb3'Medium',_utf8mb3'High'))),
  CONSTRAINT `chk_alerts_source` CHECK ((`source` in (_utf8mb3'admin',_utf8mb3'beekeeper')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `alerts` (`alert_id`, `adminID`, `beekeeperID`, `reported_by_beekeeper_id`, `source`, `title`, `description`, `pesticide_type`, `application_method`, `affected_area`, `latitude`, `longitude`, `scheduled_date`, `expiration_date`, `danger_radius_km`, `risk_level`, `approval_status`, `reviewed_at`, `reviewed_by`, `rejection_reason`, `created_at`, `updated_at`) VALUES
('ALT-000020', NULL, NULL, 'BKP-000002', 'beekeeper', 'Fungicide Application', NULL, 'Fungicide', NULL, 'Santa Monica, Quezon City', 14.71014190, 121.04801420, '2026-11-05 02:20:00', '2026-11-19 02:20:00', 3.00, 'High', 'Approved', '2026-10-05 22:25:31', 'ADM-000001', NULL, '2026-10-05 22:20:31', '2026-10-05 22:25:31'),
('ALT-000021', NULL, NULL, 'BKP-000002', 'beekeeper', 'Fungicide Application', NULL, 'Fungicide', NULL, NULL, 14.71739061, 121.23314818, '2026-10-08 04:00:00', '2026-10-22 04:00:00', 3.00, 'Medium', 'Rejected', '2026-10-05 22:25:59', 'ADM-000001', 'incomplete details', '2026-10-05 22:21:16', '2026-10-05 22:25:59'),
('ALT-000022', NULL, NULL, 'BKP-000002', 'beekeeper', 'Insecticide Application', NULL, 'Insecticide', NULL, 'Vasra, Quezon City', 14.65537430, 121.04725636, '2026-10-06 00:00:00', '2026-10-20 00:00:00', 5.00, 'High', 'Approved', '2026-10-05 22:26:06', 'ADM-000001', NULL, '2026-10-05 22:21:52', '2026-10-05 22:26:06'),
('ALT-000023', NULL, NULL, 'BKP-000002', 'beekeeper', 'Herbicide Application', NULL, 'Herbicide', NULL, 'Bagumbong, Caloocan', 14.74616514, 121.01714700, '2026-10-29 07:00:00', '2026-11-12 07:00:00', 3.00, 'Low', 'Approved', '2026-10-05 22:26:10', 'ADM-000001', NULL, '2026-10-05 22:23:07', '2026-10-05 22:26:10'),
('ALT-000024', NULL, NULL, 'BKP-000002', 'beekeeper', 'Herbicide Application', NULL, 'Herbicide', NULL, 'Tandang Sora, Quezon City', 14.68119914, 121.03614752, '2026-11-04 23:30:00', '2026-11-18 23:30:00', 3.00, 'Low', 'Approved', '2026-10-05 22:26:13', 'ADM-000001', NULL, '2026-10-05 22:24:32', '2026-10-05 22:26:13'),
('ALT-000025', 'ADM-000001', NULL, NULL, 'admin', 'Herbicide Application', NULL, 'Herbicide', NULL, 'Greater Lagro, Quezon City', 14.72173696, 121.07260753, '2026-12-05 00:00:00', '2026-12-19 00:00:00', 3.00, 'Low', 'Approved', NULL, NULL, NULL, '2026-10-05 22:27:12', '2026-10-05 22:27:12'),
('ALT-000026', 'ADM-000001', NULL, NULL, 'admin', 'Insecticide Application', NULL, 'Insecticide', NULL, 'Quarry, Montalban', 14.77581914, 121.12455994, '2026-10-31 00:00:00', '2026-11-14 00:00:00', 5.00, 'Low', 'Approved', NULL, NULL, NULL, '2026-10-05 23:10:18', '2026-10-05 23:10:18'),
('ALT-000027', 'ADM-000001', NULL, NULL, 'admin', 'Herbicide Application', NULL, 'Herbicide', NULL, 'San Bartolome, Quezon City', 14.71101617, 121.02090629, '2026-10-09 08:00:00', '2026-10-23 08:00:00', 3.00, 'Low', 'Approved', NULL, NULL, NULL, '2026-10-05 23:11:11', '2026-10-05 23:11:11'),
('ALT-000028', 'ADM-000001', NULL, NULL, 'admin', 'Insecticide Application', NULL, 'Insecticide', NULL, 'San Luis, Antipolo', 14.61078864, 121.20439715, '2026-10-22 21:00:00', '2026-11-05 21:00:00', 5.00, 'Low', 'Approved', NULL, NULL, NULL, '2026-10-05 23:12:37', '2026-10-05 23:12:37'),
('ALT-000029', NULL, NULL, 'BKP-000002', 'beekeeper', 'Fungicide Application', NULL, 'Fungicide', NULL, '508, Manila', 14.59671342, 121.01066793, '2026-10-16 04:50:00', '2026-10-30 04:50:00', 3.00, 'Medium', 'Pending', NULL, NULL, NULL, '2026-10-06 09:50:27', NULL)
-- @@END@@

-- Table `beekeepers`
DROP TABLE IF EXISTS `beekeepers`
-- @@END@@
CREATE TABLE `beekeepers` (
  `beekeeperID` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `citizenship` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `username` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact_no` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_verified` tinyint(1) NOT NULL DEFAULT '0',
  `profile_photo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `farm_photo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `farm_name` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `apiary_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Active',
  `verification_document_type` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `verification_document_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `verification_status` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Unverified',
  `verification_submitted_at` timestamp NULL DEFAULT NULL,
  `verification_reviewed_at` timestamp NULL DEFAULT NULL,
  `verification_reviewed_by` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `verification_rejection_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `terms_accepted` tinyint(1) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`beekeeperID`),
  UNIQUE KEY `uq_beekeepers_email` (`email`),
  UNIQUE KEY `uq_beekeepers_username` (`username`),
  UNIQUE KEY `uq_beekeepers_contact_no` (`contact_no`),
  KEY `idx_beekeepers_verification` (`verification_status`,`verification_submitted_at`),
  CONSTRAINT `chk_beekeepers_apiary_type` CHECK ((`apiary_type` in (_utf8mb3'Commercial Farm',_utf8mb3'Backyard',_utf8mb3'Rooftop',_utf8mb3'Wild/Forest'))),
  CONSTRAINT `chk_beekeepers_status` CHECK ((`status` in (_utf8mb3'Active',_utf8mb3'Inactive'))),
  CONSTRAINT `chk_beekeepers_verification_status` CHECK ((`verification_status` in (_utf8mb3'Unverified',_utf8mb3'Pending',_utf8mb3'Verified',_utf8mb3'Rejected')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `beekeepers` (`beekeeperID`, `name`, `citizenship`, `address`, `latitude`, `longitude`, `username`, `password`, `contact_no`, `email`, `email_verified`, `profile_photo`, `farm_photo`, `farm_name`, `apiary_type`, `status`, `verification_document_type`, `verification_document_url`, `verification_status`, `verification_submitted_at`, `verification_reviewed_at`, `verification_reviewed_by`, `verification_rejection_reason`, `terms_accepted`, `created_at`, `updated_at`, `deleted_at`) VALUES
('BKP-000001', 'John Evans Lacuas Gutierrez', 'Filipino', 'Lot 1 Blk 5, De Leon St., Moonwalk, City of ParaÃ±aque, National Capital Region (NCR)', 14.49191787, 121.01864865, 'sylp', '$2b$12$AAx4G45t0RR4YNsWPEcpGuGNQimr2mLwEJO9ciPCQ2XIe1cy8wq/u', '9296630831', 'johnevansgutierrez9@gmail.com', 1, NULL, 'bf_4adca5700e9848c2bbf0c64cd15007ff.jpg', 'Happy Bee Farm', 'Commercial Farm', 'Active', 'Valid Government ID', 'BKP-000001_194e4d2503d8443cab013f8243cde3e0.jpg', 'Verified', '2026-10-01 09:30:57', '2026-10-01 09:31:57', 'ADM-000001', NULL, 1, '2026-10-01 09:27:54', '2026-10-03 12:07:13', NULL),
('BKP-000002', 'Kelia Audrey Solis Gamayo', 'Filipino', '13 Sitio Gamayo Banaba Street Palmera Homes Phase 3, Santa Monica, Quezon City, National Capital Region (NCR)', 14.71015612, 121.04810616, 'kelibee', '$2b$12$F/T9egma1wSyeaMffDidEucwesBigwhxI3eKa0p/AIyjINxkEaiq6', '9122540303', 'kagamayo@gmail.com', 1, NULL, 'bf_3a6241c448bf4d6da2a4dad233570eb3.jpg', 'The Backyard Bees', 'Backyard', 'Active', 'Valid Government ID', 'BKP-000002_6da5238054c544cab218acb8f7451702.jpeg', 'Verified', '2026-10-01 19:15:29', '2026-10-01 19:36:23', 'ADM-000001', NULL, 1, '2026-10-01 18:41:38', '2026-10-06 10:23:27', NULL),
('BKP-000003', 'Jan Marc Soberano Jacolbia', 'Filipino', 'Misamis St, Santo Cristo, Quezon City, National Capital Region (NCR)', 14.66125890, 121.02989260, 'zhaix', '$2b$12$Vgolt0cxaaTmlAMXPKHOk.eYE24X7kzW6vqO6gLCT2Ixmz9CUNscC', '9265424419', 'janmarcsjacolbia17@gmail.com', 1, 'bp_2ca03bd459b247538a424ca55a420e98.jpg', 'bf_7cfa4c83af6c4716aa2501da256a0781.jpg', 'Zhaix the bee', 'Rooftop', 'Active', 'QCitizen ID', 'BKP-000003_e36a5f7bd94447d9bec8a2def5a20308.jpg', 'Pending', '2026-10-04 20:24:21', NULL, NULL, NULL, 1, '2026-10-04 20:18:10', '2026-10-05 09:58:45', NULL)
-- @@END@@

-- Table `chat_reports`
DROP TABLE IF EXISTS `chat_reports`
-- @@END@@
CREATE TABLE `chat_reports` (
  `chat_report_id` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `chat_id` int NOT NULL,
  `reporter_role` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reporter_id` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `details` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Pending',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`chat_report_id`),
  KEY `fk_chat_reports_chat` (`chat_id`),
  CONSTRAINT `fk_chat_reports_chat` FOREIGN KEY (`chat_id`) REFERENCES `chats` (`chat_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_chat_reports_role` CHECK ((`reporter_role` in (_utf8mb3'Citizen',_utf8mb3'Beekeeper'))),
  CONSTRAINT `chk_chat_reports_status` CHECK ((`status` in (_utf8mb3'Pending',_utf8mb3'Reviewed',_utf8mb3'Dismissed')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@

-- Table `chats`
DROP TABLE IF EXISTS `chats`
-- @@END@@
CREATE TABLE `chats` (
  `chat_id` int NOT NULL AUTO_INCREMENT,
  `citizenID` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `beekeeperID` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `citizen_marked_unread` tinyint(1) NOT NULL DEFAULT '0',
  `beekeeper_marked_unread` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`chat_id`),
  KEY `fk_chats_citizen` (`citizenID`),
  KEY `fk_chats_beekeeper` (`beekeeperID`),
  CONSTRAINT `fk_chats_beekeeper` FOREIGN KEY (`beekeeperID`) REFERENCES `beekeepers` (`beekeeperID`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_chats_citizen` FOREIGN KEY (`citizenID`) REFERENCES `citizens` (`citizenID`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `chats` (`chat_id`, `citizenID`, `beekeeperID`, `citizen_marked_unread`, `beekeeper_marked_unread`, `created_at`) VALUES
(2, 'CTZ-000001', 'BKP-000002', 0, 0, '2026-10-01 19:54:04'),
(3, 'CTZ-000002', 'BKP-000002', 0, 0, '2026-10-01 20:14:58'),
(4, 'CTZ-000003', 'BKP-000003', 0, 0, '2026-10-04 22:58:17'),
(5, 'CTZ-000003', 'BKP-000002', 0, 0, '2026-10-04 22:58:53'),
(6, 'CTZ-000002', 'BKP-000003', 0, 0, '2026-10-05 07:28:13'),
(7, 'CTZ-000002', 'BKP-000001', 0, 0, '2026-10-05 09:22:53')
-- @@END@@

-- Table `citizens`
DROP TABLE IF EXISTS `citizens`
-- @@END@@
CREATE TABLE `citizens` (
  `citizenID` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `citizenship` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `username` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact_no` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_verified` tinyint(1) NOT NULL DEFAULT '0',
  `profile_photo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Active',
  `terms_accepted` tinyint(1) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`citizenID`),
  UNIQUE KEY `uq_citizens_email` (`email`),
  UNIQUE KEY `uq_citizens_username` (`username`),
  UNIQUE KEY `uq_citizens_contact_no` (`contact_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `citizens` (`citizenID`, `name`, `citizenship`, `address`, `latitude`, `longitude`, `username`, `password`, `contact_no`, `email`, `email_verified`, `profile_photo`, `status`, `terms_accepted`, `created_at`, `updated_at`, `deleted_at`) VALUES
('CTZ-000001', 'John Evans Lacuas Gutierrez', 'Filipino', 'Lot 1 Blk 5, De Leon St., Moonwalk, City of ParaÃ±aque, National Capital Region (NCR)', 14.49191787, 121.01864865, 'sylv', '$2b$12$FAL7ue882ysO9uLdXoQpd.mYxOrV1UgI1oCYo//X/3eYRKdMb37IO', '9485348593', 'sylcrosylpha@gmail.com', 1, 'cp_210aeb391b824058a5e743fc33a1b875.jpg', 'Active', 1, '2026-10-01 09:34:17', '2026-10-01 17:15:49', NULL),
('CTZ-000002', 'Jan Marc Jacolbia', 'Filipino', 'Misamis St, Santo Cristo, Quezon City, National Capital Region (NCR)', 14.66138280, 121.02995190, 'zaxe', '$2b$12$KO2lZNMpfDrsQzYoGwvGR.5GbAtXqD1cUDTyFOpZkFldS34IRFdQS', '9265424417', 'jmjacolbiapogi@gmail.com', 1, 'cp_641fa68cc47d458099534676abc5f257.jpg', 'Active', 1, '2026-10-01 18:20:21', '2026-10-04 21:09:55', NULL),
('CTZ-000003', 'Micka Andrea Apostol Soriano', 'Filipino', '357 Narra St., Payatas, Quezon City, National Capital Region (NCR)', 14.71014810, 121.04797740, 'mickasrn', '$2b$12$hLeqcWq6eegU5uhQlZZ9Xe8ArIIvmxilis9U9sa2DUjBbSrzkYS7.', '9270497014', 'mickasrn7@gmail.com', 1, NULL, 'Active', 1, '2026-10-01 18:33:19', '2026-10-01 18:34:03', NULL),
('CTZ-000004', 'Kelia Audrey Gamayo', 'Filipino', 'Santa Monica, Quezon City, National Capital Region (NCR)', 14.71018712, 121.04806478, 'kasgamayo', '$2b$12$wlp0nCMCgPM1UbaiTniulehwKQ6QzD4SBSyEewCuX2s4d4Xexhzhi', '9393534330', 'kagamayow@gmail.com', 1, NULL, 'Active', 1, '2026-10-01 18:33:28', '2026-10-01 18:34:30', NULL),
('CTZ-000005', 'Jan Marc Jacolbia', 'Filipino', 'Misamis St, Santo Cristo, Quezon City, National Capital Region (NCR)', 14.66138410, 121.02995280, 'zaxe17', '$2b$12$86s8mZhxMlCC0Q3h9XtIAejBDG9AlMOl.sclrVW.FP5gJy.hecHOO', '9265424418', 'jmjacolbiapogi17@gmail.com', 1, NULL, 'Active', 1, '2026-10-01 21:55:05', '2026-10-01 21:55:39', NULL)
-- @@END@@

-- Table `cv_scans`
DROP TABLE IF EXISTS `cv_scans`
-- @@END@@
CREATE TABLE `cv_scans` (
  `cvscan_id` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `citizenID` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `image_url` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `identified_species` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `confidence_score` decimal(5,2) DEFAULT NULL,
  `scanned_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`cvscan_id`),
  KEY `fk_cv_scans_citizen` (`citizenID`),
  CONSTRAINT `fk_cv_scans_citizen` FOREIGN KEY (`citizenID`) REFERENCES `citizens` (`citizenID`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `cv_scans` (`cvscan_id`, `citizenID`, `image_url`, `identified_species`, `confidence_score`, `scanned_at`) VALUES
('CVS-000014', 'CTZ-000001', '/uploads/cv-scans/e1822585c3cf45c986d6e84bfb8138c0_1000007766.jpg', 'Apis Mellifera', 61.95, '2026-10-01 17:44:08'),
('CVS-000015', 'CTZ-000001', '/uploads/cv-scans/b63bd0292298413f8f5363d546e7a723_1000007767.jpg', 'Apis Mellifera', 58.41, '2026-10-01 17:55:19'),
('CVS-000016', 'CTZ-000002', '/uploads/cv-scans/66375fb29db746d693e269fa2488a0fc_capture-1790850440910.jpg', NULL, NULL, '2026-10-01 18:27:24'),
('CVS-000017', 'CTZ-000001', '/uploads/cv-scans/0045c46d8d4f4243bde6134d0121b321_capture-1790856143269.jpg', NULL, NULL, '2026-10-01 20:03:19'),
('CVS-000018', 'CTZ-000002', '/uploads/cv-scans/2075465a473e4e168ad6d539e4862672_1000007766.jpg', 'Apis Mellifera', 61.95, '2026-10-01 20:04:17'),
('CVS-000019', 'CTZ-000002', '/uploads/cv-scans/8161b861265e4efab8381694a0a0e5cd_1000007767.jpg', 'Apis Mellifera', 58.41, '2026-10-01 20:04:26'),
('CVS-000020', 'CTZ-000002', '/uploads/cv-scans/b80202373c514b17a6a90d8bdd44e3b4_1000007745.jpg', 'Apis Mellifera', 66.61, '2026-10-01 20:04:41'),
('CVS-000021', 'CTZ-000003', '/uploads/cv-scans/70823e360cde43da9aef5f4e9604e9e8_64335.jpg', 'Apis Mellifera', 59.73, '2026-10-01 20:34:41'),
('CVS-000022', 'CTZ-000003', '/uploads/cv-scans/c915a613e2f44bd6a0c9edaae8c18f7d_64224.jpg', 'Apis Cerana', 48.77, '2026-10-01 20:36:58'),
('CVS-000023', 'CTZ-000003', '/uploads/cv-scans/8cbda3fb382a4e72908e55ce50f30c3d_64224.jpg', 'Apis Cerana', 48.77, '2026-10-01 20:37:21'),
('CVS-000024', 'CTZ-000003', '/uploads/cv-scans/2d1d9f17ac794bc6be2d0e3e54fcf6ec_64222.jpg', 'Apis Cerana', 44.26, '2026-10-01 20:39:13'),
('CVS-000025', 'CTZ-000003', '/uploads/cv-scans/ed3c770d317f40c993c076e7151085cb_64222.jpg', 'Apis Cerana', 44.26, '2026-10-01 21:20:02'),
('CVS-000026', 'CTZ-000001', '/uploads/cv-scans/8d822a0809fb40609d9372a2728f392b_inbound7304788695809266203.jpg', 'Apis Cerana', 70.12, '2026-10-02 16:59:10'),
('CVS-000027', 'CTZ-000001', '/uploads/cv-scans/7e46b4cc897b47d5bdb104f08f7970f0_capture-1790931653450.jpg', NULL, NULL, '2026-10-02 17:00:56'),
('CVS-000028', 'CTZ-000001', '/uploads/cv-scans/5722123247a4439db3866426428d1e4b_capture-1790931697278.jpg', 'Apis Mellifera', 60.52, '2026-10-02 17:01:49'),
('CVS-000029', 'CTZ-000001', '/uploads/cv-scans/a31e699a10a544f1a4ada2d4a22d1398_capture-1790931739161.jpg', NULL, NULL, '2026-10-02 17:02:25'),
('CVS-000030', NULL, '/uploads/cv-scans/d7ebd88b5429440687a53cf8bb488f8f_capture.jpg', NULL, NULL, '2026-10-02 17:25:14'),
('CVS-000031', NULL, '/uploads/cv-scans/c1b34785ae3749f6bc342b720289f627_IMG_5616.jpeg', 'Unidentified', 59.14, '2026-10-02 23:11:12'),
('CVS-000032', 'CTZ-000002', '/uploads/cv-scans/6e3d16628b354e90a6c406925b20a522_bee.jpg', 'Unidentified', 59.31, '2026-10-02 23:22:49'),
('CVS-000033', 'CTZ-000002', '/uploads/cv-scans/b20908311df14045b728983a75773848_bee.jpg', 'Unidentified', 59.31, '2026-10-02 23:32:48'),
('CVS-000034', 'CTZ-000002', '/uploads/cv-scans/8f6d763d7dc0434b96ffe9fb5b2b7f3a_Apis_mellifera_Western_honey_bee.jpg', 'Unidentified', 15.24, '2026-10-02 23:34:48'),
('CVS-000035', 'CTZ-000002', '/uploads/cv-scans/1a5b4fac90a248d2b31bb1846a384471_Apis_mellifera_Western_honey_bee.jpg', 'Unidentified', 15.24, '2026-10-02 23:35:25'),
('CVS-000036', 'CTZ-000002', '/uploads/cv-scans/7065d32f61124a579032da4a5b8e903d_0c4ca82c-a7c4-4713-b4f1-fa61c4068249.jpg', 'Unidentified', 63.59, '2026-10-02 23:36:43'),
('CVS-000037', NULL, '/uploads/cv-scans/93142cf4ed074ecaa26063fbebdd983c_1000007786.jpg', 'Unidentified', 15.24, '2026-10-02 23:37:30'),
('CVS-000038', NULL, '/uploads/cv-scans/be39a8336d294540aacda98eb67de420_1000007785.jpg', 'Unidentified', 62.44, '2026-10-02 23:37:41'),
('CVS-000039', NULL, '/uploads/cv-scans/9e48c12d8cf044cdb6bb72c42c17892d_1000007787.jpg', 'Apis Mellifera', 49.22, '2026-10-02 23:38:19'),
('CVS-000040', 'CTZ-000002', '/uploads/cv-scans/aa103bde8e4547b79afd3989b2f59334_035dacd7-abba-4656-b8d5-218eabf32045.jpg', 'Apis Mellifera', 55.78, '2026-10-02 23:38:41'),
('CVS-000041', NULL, '/uploads/cv-scans/e9769572e9ed43d68b9a9f7302a795fa_1000007788.jpg', 'Apis Mellifera', 65.44, '2026-10-02 23:39:11'),
('CVS-000042', NULL, '/uploads/cv-scans/dd5cdcaa4e814a2e88f3af5049732aee_1000007790.jpg', 'Apis Mellifera', 27.30, '2026-10-02 23:52:23'),
('CVS-000043', 'CTZ-000001', '/uploads/cv-scans/3aea7b703d0d43588e11de623976ec08_Screenshot_2026-10-03_051432.png', 'Apis Mellifera', 61.66, '2026-10-03 05:15:12'),
('CVS-000044', 'CTZ-000001', '/uploads/cv-scans/976718f68ec645fb9c3587ee3bb1763c_Apis-mellifera-yemenitica-the-local-bee.png', 'Apis Mellifera', 59.06, '2026-10-03 05:17:10'),
('CVS-000045', NULL, '/uploads/cv-scans/03d53c1a83f149bebaf3960f051177b8_inbound7557107404252947688.jpg', 'Apis Mellifera', 62.11, '2026-10-03 07:28:29'),
('CVS-000046', NULL, '/uploads/cv-scans/7ca6510414004de4b5bdc4b0e1ed143b_035dacd7-abba-4656-b8d5-218eabf32045.jpg', 'Apis Mellifera', 55.78, '2026-10-03 16:56:52'),
('CVS-000047', NULL, '/uploads/cv-scans/18da8b33029a4a198f6706416f0cb20a_035dacd7-abba-4656-b8d5-218eabf32045.jpg', 'Apis Mellifera', 55.78, '2026-10-03 16:57:13'),
('CVS-000048', NULL, '/uploads/cv-scans/d9d381358cc241a18945a3d261a74e68_western-honey-bee-34108.jpg', 'Unidentified', 41.53, '2026-10-03 16:57:56'),
('CVS-000049', 'CTZ-000002', '/uploads/cv-scans/d07a13e42f144100a0ee6d27af5340e2_ezgif-frame-001.jpg', 'Apis Cerana', 59.04, '2026-10-03 21:01:42'),
('CVS-000050', 'CTZ-000002', '/uploads/cv-scans/dd0e05f55b11400b91bf3b54c3442bcf_c9d49d73eb1d4020a0105509613e011a_ezgif-frame-001.jpg', 'Apis Cerana', 59.04, '2026-10-03 21:14:22'),
('CVS-000051', 'CTZ-000002', '/uploads/cv-scans/9dd8d01282c749d7a4475fc76c71d051_ed3c770d317f40c993c076e7151085cb_64222.jpg', 'Apis Cerana', 44.26, '2026-10-03 21:15:52'),
('CVS-000052', 'CTZ-000002', '/uploads/cv-scans/ae1120dc58a549fea9b27a158b9165d7_0ea75583c4fa4486b7a0603e500e5ca9_inbound8011547062913569486.jpg', 'Apis Cerana', 70.12, '2026-10-04 16:22:49'),
('CVS-000053', 'CTZ-000003', '/uploads/cv-scans/5cda37d467d34202a4da58ff34e9d72c_75aae866-39e6-443a-aef7-960d0df4169d.jpg', 'Unidentified', 16.19, '2026-10-04 23:01:44'),
('CVS-000054', 'CTZ-000003', '/uploads/cv-scans/0cb3dca728454df09cc24c306d844b00_75aae866-39e6-443a-aef7-960d0df4169d.jpg', 'Unidentified', 16.19, '2026-10-04 23:02:27'),
('CVS-000055', NULL, '/uploads/cv-scans/e56e30541ec4429ea9d1e8459a9b2163_1000007776.webp', NULL, NULL, '2026-10-05 08:13:44'),
('CVS-000056', NULL, '/uploads/cv-scans/c8d852ea265b47eaa1e8ec700198fb8f_1000007786.jpg', 'Unidentified', 15.24, '2026-10-05 08:14:08'),
('CVS-000057', 'CTZ-000003', '/uploads/cv-scans/9043fff87a824349baffeb97213fb2f2_capture-1791172714125.jpg', 'Apis Mellifera', 66.01, '2026-10-05 11:58:41'),
('CVS-000058', 'CTZ-000003', '/uploads/cv-scans/b8ad4a9e415f40548743c70d2267977f_capture-1791172739950.jpg', 'Apis Mellifera', 60.85, '2026-10-05 11:59:02'),
('CVS-000059', 'CTZ-000003', '/uploads/cv-scans/aa13d709d88a426a9d0341cb0cb3edd4_capture-1791172748201.jpg', 'Apis Mellifera', 60.86, '2026-10-05 11:59:09'),
('CVS-000060', 'CTZ-000003', '/uploads/cv-scans/4672bfa1162245fba719e6e631e1a05d_capture-1791172756955.jpg', 'Apis Mellifera', 65.68, '2026-10-05 11:59:19'),
('CVS-000061', 'CTZ-000003', '/uploads/cv-scans/5304ea124c0a42c8942bdcf636873c12_0ea75583c4fa4486b7a0603e500e5ca9_inbound8011547062913569486.jpg', 'Apis Cerana', 70.12, '2026-10-05 18:25:48'),
('CVS-000062', NULL, '/uploads/cv-scans/9f17f2ed97074e6e872298d3729a7450_bb669ea261334c699cde225f7ddec78b_ezgif-frame-001.jpg', 'Apis Cerana', 59.04, '2026-10-05 19:38:33'),
('CVS-000063', 'CTZ-000003', '/uploads/cv-scans/33492763e4294fff98460585d6883b16_b80202373c514b17a6a90d8bdd44e3b4_1000007745.jpg', 'Apis Mellifera', 66.61, '2026-10-05 19:40:23'),
('CVS-000064', NULL, '/uploads/cv-scans/344059ae48b44c2ba74a51609a9152af_capture.jpg', 'Apis Mellifera', 74.83, '2026-10-05 20:35:07'),
('CVS-000065', NULL, '/uploads/cv-scans/72d5a29e95c64777bed9d9686cabc613_capture.jpg', 'Tetragonula biroi', 51.94, '2026-10-05 20:35:43'),
('CVS-000066', NULL, '/uploads/cv-scans/0bd6c11d4a82462bbc57d852378efcdb_capture.jpg', 'Unidentified', 29.57, '2026-10-05 20:38:18'),
('CVS-000067', NULL, '/uploads/cv-scans/0c0503a499844f25b2ad9ac5524332eb_capture.jpg', 'Tetragonula biroi', 68.51, '2026-10-05 20:42:21'),
('CVS-000068', NULL, '/uploads/cv-scans/7548c49d70c64063805b0cae6de1b0bd_1000007787.jpg', 'Apis Mellifera', 49.22, '2026-10-05 20:42:29'),
('CVS-000069', NULL, '/uploads/cv-scans/67bbc7c83e3145ff8d775366186be1c9_1000007788.jpg', 'Apis Mellifera', 65.44, '2026-10-05 20:42:38'),
('CVS-000070', NULL, '/uploads/cv-scans/1473f87a65414e4cb1ad0f2a11b3cd03_1000007790.jpg', 'Apis Mellifera', 27.30, '2026-10-05 20:42:58'),
('CVS-000071', NULL, '/uploads/cv-scans/76c9a06d82124a9388918559e85861ce_1000007766.jpg', 'Apis Mellifera', 61.95, '2026-10-05 20:43:14'),
('CVS-000072', 'CTZ-000003', '/uploads/cv-scans/e8d64088d5b64e1b98e96dcbe901b74c_capture-1791204190828.jpg', 'Tetragonula biroi', 49.16, '2026-10-05 20:43:14'),
('CVS-000073', 'CTZ-000003', '/uploads/cv-scans/64ded00631c34a72846520187a6c8136_capture-1791204243133.jpg', NULL, NULL, '2026-10-05 20:44:04'),
('CVS-000074', 'CTZ-000003', '/uploads/cv-scans/a1bb7f728bab42fc9949ca0cc63d0794_capture-1791204255003.jpg', 'Tetragonula biroi', 53.03, '2026-10-05 20:44:17'),
('CVS-000075', 'CTZ-000003', '/uploads/cv-scans/2fc42ae82fb14ced98a6fc532e61ee7f_capture-1791204298800.jpg', 'Apis Cerana', 54.17, '2026-10-05 20:44:59'),
('CVS-000076', NULL, '/uploads/cv-scans/1b145755b6a64a6391695d9067ddc93e_1000007799.jpg', 'Apis Cerana', 68.47, '2026-10-05 20:45:15'),
('CVS-000077', 'CTZ-000003', '/uploads/cv-scans/8f84d3f4aea1420ebfc79911c7fe8200_capture-1791204316807.jpg', 'Apis Cerana', 65.49, '2026-10-05 20:45:19'),
('CVS-000078', NULL, '/uploads/cv-scans/3472a3dc8c7d4b1cae5bc8a206bf55d6_capture.jpg', 'Tetragonula biroi', 68.51, '2026-10-05 20:45:36'),
('CVS-000079', 'CTZ-000003', '/uploads/cv-scans/a9e5778cb9d047408795674d9903b433_capture-1791204456001.jpg', 'Apis Mellifera', 53.38, '2026-10-05 20:47:37'),
('CVS-000080', NULL, '/uploads/cv-scans/625eb50be150455abe3e81944c8452da_1000007800.jpg', 'Apis Mellifera', 62.08, '2026-10-05 20:47:49'),
('CVS-000081', NULL, '/uploads/cv-scans/344075464a294cd9a6750045d3318ddb_images.jpeg', 'Unidentified', 59.61, '2026-10-05 20:59:44'),
('CVS-000082', NULL, '/uploads/cv-scans/df5c598d0c554499aa28b653ccfe2945_capture.jpg', 'Tetragonula biroi', 68.51, '2026-10-05 22:14:41'),
('CVS-000083', NULL, '/uploads/cv-scans/fc318740d32344b582001a048ef0aca5_0ea75583c4fa4486b7a0603e500e5ca9_inbound8011547062913569486.jpg', 'Apis Cerana', 70.12, '2026-10-06 09:30:25'),
('CVS-000084', NULL, '/uploads/cv-scans/c672059c57ea4047a5871d5afcbc2c65_0ea75583c4fa4486b7a0603e500e5ca9_inbound8011547062913569486.jpg', 'Apis Cerana', 70.12, '2026-10-06 09:30:46')
-- @@END@@

-- Table `follows`
DROP TABLE IF EXISTS `follows`
-- @@END@@
CREATE TABLE `follows` (
  `citizenID` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `beekeeperID` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`citizenID`,`beekeeperID`),
  KEY `fk_follows_beekeeper` (`beekeeperID`),
  CONSTRAINT `fk_follows_beekeeper` FOREIGN KEY (`beekeeperID`) REFERENCES `beekeepers` (`beekeeperID`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_follows_citizen` FOREIGN KEY (`citizenID`) REFERENCES `citizens` (`citizenID`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `follows` (`citizenID`, `beekeeperID`, `created_at`) VALUES
('CTZ-000002', 'BKP-000002', '2026-10-02 23:18:38')
-- @@END@@

-- Table `hives`
DROP TABLE IF EXISTS `hives`
-- @@END@@
CREATE TABLE `hives` (
  `hive_id` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `beekeeper_id` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hive_name` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bee_species` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `location` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `date_established` date NOT NULL,
  `queen_installed_date` date DEFAULT NULL,
  `historical_yield_kg` decimal(10,2) DEFAULT NULL,
  `historical_yield_year` int DEFAULT NULL,
  `health_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hive_state` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`hive_id`),
  KEY `idx_hives_beekeeper` (`beekeeper_id`),
  CONSTRAINT `fk_hives_beekeeper` FOREIGN KEY (`beekeeper_id`) REFERENCES `beekeepers` (`beekeeperID`) ON UPDATE CASCADE,
  CONSTRAINT `chk_hives_health_status` CHECK ((`health_status` in (_utf8mb3'Healthy',_utf8mb3'Needs Attention',_utf8mb3'Weak',_utf8mb3'Diseased')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `hives` (`hive_id`, `beekeeper_id`, `hive_name`, `bee_species`, `location`, `latitude`, `longitude`, `date_established`, `queen_installed_date`, `historical_yield_kg`, `historical_yield_year`, `health_status`, `hive_state`, `created_at`, `updated_at`) VALUES
('HV-000001', 'BKP-000002', 'AM1', 'Apis mellifera', 'Santa Monica, Quezon City', 14.7107874, 121.0481842, '2024-01-02', '2026-05-02', 30.00, 2026, 'Healthy', 'Active', '2026-10-01 18:45:33', '2026-10-01 19:00:36'),
('HV-000002', 'BKP-000002', 'AM2', 'Apis mellifera', 'Santa Monica, Quezon City', 14.7101419, 121.0481339, '2026-01-02', '2026-05-15', 28.00, 2026, 'Healthy', 'Active', '2026-10-01 18:46:40', '2026-10-01 19:22:46'),
('HV-000003', 'BKP-000002', 'AM3', 'Apis mellifera', 'Santa Monica, Quezon City', 14.7109482, 121.0486929, '2026-01-02', '2026-05-03', 22.00, 2026, 'Weak', 'Active', '2026-10-01 18:47:56', '2026-10-06 09:47:10'),
('HV-000004', 'BKP-000002', 'AM4', 'Apis mellifera', 'Payatas, Quezon City', 14.7071755, 121.0964527, '2024-02-11', '2024-02-11', 16.00, 2026, 'Needs Attention', 'Active', '2026-10-01 18:49:14', '2026-10-01 19:24:09'),
('HV-000005', 'BKP-000002', 'AM5', 'Apis mellifera', 'Payatas, Quezon City', 14.7069635, 121.0964574, '2024-02-11', '2024-02-11', 15.00, 2026, 'Weak', 'Active', '2026-10-01 18:51:11', '2026-10-01 19:24:32'),
('HV-000006', 'BKP-000002', 'AM6', 'Apis mellifera', 'Vasra, Quezon City', 14.6562857, 121.0468967, '2025-09-01', '2025-09-01', 28.00, 2025, 'Healthy', 'Active', '2026-10-01 18:54:12', NULL),
('HV-000007', 'BKP-000002', 'AM7', 'Apis mellifera', 'Vasra, Quezon City', 14.6561514, 121.0467173, '2025-09-01', '2025-09-01', 26.00, 2025, 'Healthy', 'Active', '2026-10-01 18:55:37', '2026-10-01 19:26:47'),
('HV-000008', 'BKP-000002', 'AM8', 'Apis mellifera', 'Vasra, Quezon City', 14.6560684, 121.0471033, '2025-09-01', '2025-09-01', 27.00, 2025, 'Healthy', 'Active', '2026-10-01 18:56:51', '2026-10-01 18:58:04'),
('HV-000009', 'BKP-000002', 'AM9', 'Apis mellifera', 'Vasra, Quezon City', 14.6558181, 121.0468906, '2026-09-01', '2026-09-01', 30.00, 2025, 'Healthy', 'Active', '2026-10-01 19:04:53', NULL),
('HV-000010', 'BKP-000002', 'AM10', 'Apis mellifera', 'Vasra, Quezon City', 14.6557834, 121.0473780, '2026-09-01', '2026-09-01', 26.00, 2025, 'Healthy', 'Active', '2026-10-01 19:05:44', NULL),
('HV-000011', 'BKP-000002', 'AM11', 'Apis mellifera', 'Santa Monica, Quezon City', 14.7102698, 121.0481951, '2025-09-15', '2025-09-15', 15.00, 2026, 'Healthy', 'Active', '2026-10-01 19:30:16', '2026-10-01 19:30:54'),
('HV-000012', 'BKP-000003', 'KW1', 'Tetragonula biroi', 'Santo Cristo, Quezon City', 14.6623023, 121.0282119, '2025-10-01', '2025-10-01', 25.00, 2026, 'Healthy', 'Active', '2026-10-05 22:36:52', NULL),
('HV-000013', 'BKP-000003', 'KW2', 'Tetragonula biroi', 'Santo Cristo, Quezon City', 14.6623498, 121.0281199, '2025-10-01', '2025-10-01', NULL, NULL, 'Healthy', 'Active', '2026-10-05 22:37:59', NULL),
('HV-000014', 'BKP-000003', 'KW3', 'Tetragonula biroi', 'Santo Cristo, Quezon City', 14.6623467, 121.0281368, '2025-10-01', '2025-10-01', NULL, NULL, 'Healthy', 'Active', '2026-10-05 22:40:14', NULL),
('HV-000015', 'BKP-000003', 'AM1', 'Apis mellifera', 'Santo Cristo, Quezon City', 14.6623202, 121.0284018, '2025-10-01', '2025-10-01', NULL, NULL, 'Healthy', 'Active', '2026-10-05 22:41:55', NULL),
('HV-000016', 'BKP-000003', 'AM2', 'Apis mellifera', 'Santo Cristo, Quezon City', 14.6622790, 121.0283685, '2025-10-01', '2025-10-01', NULL, NULL, 'Healthy', 'Active', '2026-10-05 22:42:24', NULL),
('HV-000017', 'BKP-000003', 'AM3', 'Apis mellifera', 'Santo Cristo, Quezon City', 14.6623001, 121.0283031, '2025-10-01', '2025-10-01', NULL, NULL, 'Healthy', 'Active', '2026-10-05 22:43:08', NULL),
('HV-000018', 'BKP-000003', 'AM4', 'Apis mellifera', 'Vasra, Quezon City', 14.6556615, 121.0471886, '2024-09-01', '2024-09-01', 30.00, 2025, 'Needs Attention', 'Active', '2026-10-05 22:46:19', '2026-10-05 22:52:13'),
('HV-000019', 'BKP-000003', 'AM5', 'Apis mellifera', 'Vasra, Quezon City', 14.6555742, 121.0471054, '2024-09-01', '2026-10-05', 28.00, 2026, 'Healthy', 'Active', '2026-10-05 22:47:17', '2026-10-05 22:52:37'),
('HV-000020', 'BKP-000003', 'AM6', 'Apis mellifera', 'Vasra, Quezon City', 14.6556104, 121.0472610, '2024-09-01', '2024-09-01', 27.00, 2025, 'Weak', 'Active', '2026-10-05 22:48:27', '2026-10-05 22:51:42'),
('HV-000021', 'BKP-000003', 'AM7', 'Apis mellifera', 'Vasra, Quezon City', 14.6555734, 121.0472054, '2024-09-01', '2024-09-01', 23.00, 2026, 'Weak', 'Active', '2026-10-05 22:49:26', '2026-10-05 22:51:26'),
('HV-000022', 'BKP-000002', 'KW1', 'Tetragonula biroi', 'Santa Monica, Quezon City', 14.7101642, 121.0480088, '2025-05-01', '2025-05-01', 20.00, 2025, 'Healthy', 'Active', '2026-10-05 23:05:34', NULL),
('HV-000023', 'BKP-000002', 'KW2', 'Tetragonula biroi', 'Santa Monica, Quezon City', 14.7101595, 121.0480052, '2025-05-01', '2025-05-01', 15.00, 2025, 'Healthy', 'Active', '2026-10-05 23:06:10', NULL),
('HV-000024', 'BKP-000002', 'KW3', 'Tetragonula biroi', 'Santa Monica, Quezon City', 14.7101687, 121.0480036, '2025-05-01', '2026-10-05', NULL, NULL, 'Healthy', 'Active', '2026-10-05 23:06:52', '2026-10-05 23:07:25'),
('HV-000025', 'BKP-000002', 'AM11', 'Apis mellifera', 'Payatas, Quezon City', 14.7068691, 121.0964934, '2024-10-01', '2024-10-01', 23.00, 2025, 'Needs Attention', 'Active', '2026-10-05 23:16:10', '2026-10-05 23:16:10'),
('HV-000026', 'BKP-000002', 'AM12', 'Apis mellifera', 'Payatas, Quezon City', 14.7067821, 121.0964769, '2024-10-01', '2024-10-01', 25.00, 2025, 'Needs Attention', 'Active', '2026-10-05 23:17:05', '2026-10-05 23:17:05'),
('HV-000027', 'BKP-000002', 'KW4', 'Tetragonula biroi', 'Payatas, Quezon City', 14.7070226, 121.0965353, '2025-10-01', '2025-10-01', 17.00, 2026, 'Healthy', 'Active', '2026-10-06 00:50:06', NULL),
('HV-000028', 'BKP-000002', 'KW5', 'Tetragonula biroi', 'Payatas, Quezon City', 14.7070205, 121.0966244, '2025-10-01', '2025-10-01', 18.00, 2026, 'Healthy', 'Active', '2026-10-06 00:50:44', NULL),
('HV-000029', 'BKP-000002', 'KW6', 'Tetragonula biroi', 'Payatas, Quezon City', 14.7069394, 121.0966273, '2025-10-01', '2025-10-01', 20.00, 2026, 'Healthy', 'Active', '2026-10-06 00:51:19', NULL)
-- @@END@@

-- Table `hives_maintenance`
DROP TABLE IF EXISTS `hives_maintenance`
-- @@END@@
CREATE TABLE `hives_maintenance` (
  `maintenance_id` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hive_id` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `activity_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `activity_date` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`maintenance_id`),
  KEY `fk_hives_maintenance_hive` (`hive_id`),
  CONSTRAINT `fk_hives_maintenance_hive` FOREIGN KEY (`hive_id`) REFERENCES `hives` (`hive_id`) ON UPDATE CASCADE,
  CONSTRAINT `chk_hives_maintenance_activity_type` CHECK ((`activity_type` in (_utf8mb3'Feeding',_utf8mb3'Mite Treatment',_utf8mb3'Inspection')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `hives_maintenance` (`maintenance_id`, `hive_id`, `activity_type`, `remarks`, `activity_date`, `created_at`) VALUES
('MT-261001105732', 'HV-000008', 'Inspection', 'Harvest Inspection: Normal / Healthy', '2026-02-14', '2026-10-01 18:57:32'),
('MT-261001105803', 'HV-000008', 'Inspection', 'Harvest Inspection: Normal / Healthy', '2026-10-01', '2026-10-01 18:58:03'),
('MT-261001110006', 'HV-000001', 'Inspection', 'Harvest Inspection: Normal / Healthy', '2026-03-18', '2026-10-01 19:00:06'),
('MT-261001110034', 'HV-000001', 'Inspection', 'Harvest Inspection: Normal / Healthy', '2026-10-01', '2026-10-01 19:00:35'),
('MT-261001112228', 'HV-000002', 'Inspection', 'Harvest Inspection: Normal / Healthy', '2026-10-01', '2026-10-01 19:22:28'),
('MT-261001112245', 'HV-000002', 'Inspection', 'Harvest Inspection: Normal / Healthy', '2026-10-01', '2026-10-01 19:22:45'),
('MT-261001112322', 'HV-000003', 'Inspection', 'Harvest Inspection: Normal / Healthy', '2026-02-14', '2026-10-01 19:23:22'),
('MT-261001112347', 'HV-000003', 'Inspection', 'Harvest Inspection: Normal / Healthy', '2026-10-01', '2026-10-01 19:23:47'),
('MT-261001112407', 'HV-000004', 'Inspection', 'Harvest Inspection: Normal / Healthy', '2026-10-01', '2026-10-01 19:24:07'),
('MT-261001112431', 'HV-000005', 'Inspection', 'Harvest Inspection: Normal / Healthy', '2026-10-01', '2026-10-01 19:24:31'),
('MT-261001112505', 'HV-000006', 'Inspection', 'Harvest Inspection: Normal / Healthy', '2026-02-08', '2026-10-01 19:25:05'),
('MT-261001112526', 'HV-000006', 'Inspection', 'Harvest Inspection: Normal / Healthy', '2026-09-29', '2026-10-01 19:25:26'),
('MT-261001112603', 'HV-000007', 'Inspection', 'Harvest Inspection: Normal / Healthy', '2026-02-14', '2026-10-01 19:26:03'),
('MT-261001112646', 'HV-000007', 'Inspection', 'Harvest Inspection: Normal / Healthy', '2026-09-29', '2026-10-01 19:26:46'),
('MT-261005144332', 'HV-000017', 'Inspection', 'Harvest Inspection: Normal / Healthy', '2026-10-05', '2026-10-05 22:43:32'),
('MT-261005144343', 'HV-000016', 'Inspection', 'Harvest Inspection: Normal / Healthy', '2026-10-05', '2026-10-05 22:43:43'),
('MT-261005144413', 'HV-000012', 'Inspection', 'Harvest Inspection: Normal / Healthy', '2026-10-05', '2026-10-05 22:44:13'),
('MT-261005144425', 'HV-000016', 'Inspection', 'Harvest Inspection: Normal / Healthy', '2026-10-05', '2026-10-05 22:44:25'),
('MT-261005144451', 'HV-000014', 'Inspection', 'Harvest Inspection: Normal / Healthy', '2026-10-05', '2026-10-05 22:44:51'),
('MT-261005144500', 'HV-000013', 'Inspection', 'Harvest Inspection: Normal / Healthy', '2026-10-05', '2026-10-05 22:45:00'),
('MT-261005145126', 'HV-000021', 'Inspection', 'Harvest Inspection: Presence of Queen Cells', '2026-10-05', '2026-10-05 22:51:26'),
('MT-261005145142', 'HV-000020', 'Inspection', 'Harvest Inspection: Normal / Healthy', '2026-10-05', '2026-10-05 22:51:42'),
('MT-261005145200', 'HV-000019', 'Inspection', 'Harvest Inspection: Normal / Healthy', '2026-10-05', '2026-10-05 22:52:00'),
('MT-261005145213', 'HV-000018', 'Inspection', 'Harvest Inspection: Normal / Healthy', '2026-10-05', '2026-10-05 22:52:13'),
('MT-261005145237', 'HV-000019', 'Inspection', 'Physical Inspection: Normal / Healthy', '2026-10-05', '2026-10-05 22:52:37'),
('MT-261005145442', 'HV-000012', 'Inspection', 'Physical Inspection: Normal / Healthy', '2026-01-05', '2026-10-05 22:54:42'),
('MT-261005145455', 'HV-000012', 'Inspection', 'Physical Inspection: Normal / Healthy', '2026-02-05', '2026-10-05 22:54:55'),
('MT-261005145506', 'HV-000012', 'Inspection', 'Physical Inspection: Normal / Healthy', '2026-03-05', '2026-10-05 22:55:06'),
('MT-261005145521', 'HV-000012', 'Inspection', 'Physical Inspection: Normal / Healthy', '2026-04-05', '2026-10-05 22:55:21'),
('MT-261005145553', 'HV-000015', 'Inspection', 'Physical Inspection: Normal / Healthy', '2026-01-05', '2026-10-05 22:55:53'),
('MT-261005145602', 'HV-000015', 'Inspection', 'Physical Inspection: Normal / Healthy', '2026-02-05', '2026-10-05 22:56:02'),
('MT-261005145613', 'HV-000015', 'Inspection', 'Physical Inspection: Normal / Healthy', '2026-03-05', '2026-10-05 22:56:13'),
('MT-261005145632', 'HV-000015', 'Inspection', 'Physical Inspection: Normal / Healthy', '2026-04-05', '2026-10-05 22:56:32'),
('MT-261005145641', 'HV-000015', 'Inspection', 'Physical Inspection: Normal / Healthy', '2026-05-05', '2026-10-05 22:56:41'),
('MT-261005145649', 'HV-000015', 'Inspection', 'Physical Inspection: Normal / Healthy', '2026-06-05', '2026-10-05 22:56:49'),
('MT-261005145655', 'HV-000015', 'Inspection', 'Physical Inspection: Normal / Healthy', '2026-07-05', '2026-10-05 22:56:55'),
('MT-261005145703', 'HV-000015', 'Inspection', 'Physical Inspection: Normal / Healthy', '2026-08-05', '2026-10-05 22:57:03'),
('MT-261005145712', 'HV-000015', 'Inspection', 'Physical Inspection: Normal / Healthy', '2026-09-05', '2026-10-05 22:57:12'),
('MT-261005145714', 'HV-000015', 'Inspection', 'Physical Inspection: Normal / Healthy', '2026-10-05', '2026-10-05 22:57:14'),
('MT-261005150251', 'HV-000012', 'Inspection', 'Harvest Inspection: Normal / Healthy', '2026-02-05', '2026-10-05 23:02:51'),
('MT-261005150311', 'HV-000013', 'Inspection', 'Harvest Inspection: Normal / Healthy', '2026-02-05', '2026-10-05 23:03:11'),
('MT-261005150329', 'HV-000014', 'Inspection', 'Harvest Inspection: Normal / Healthy', '2026-02-05', '2026-10-05 23:03:29'),
('MT-261005150725', 'HV-000024', 'Inspection', 'Physical Inspection: Normal / Healthy', '2026-10-05', '2026-10-05 23:07:25'),
('MT-261005150811', 'HV-000024', 'Inspection', 'Harvest Inspection: Normal / Healthy', '2026-04-05', '2026-10-05 23:08:11'),
('MT-261005150831', 'HV-000023', 'Inspection', 'Harvest Inspection: Normal / Healthy', '2026-04-05', '2026-10-05 23:08:31'),
('MT-261005150848', 'HV-000022', 'Inspection', 'Harvest Inspection: Normal / Healthy', '2026-04-05', '2026-10-05 23:08:48'),
('MT-261005165201', 'HV-000029', 'Inspection', 'Harvest Inspection: Normal / Healthy', '2026-05-05', '2026-10-06 00:52:01'),
('MT-261005165226', 'HV-000028', 'Inspection', 'Harvest Inspection: Normal / Healthy', '2026-05-05', '2026-10-06 00:52:26'),
('MT-261005165247', 'HV-000027', 'Inspection', 'Harvest Inspection: Normal / Healthy', '2026-05-05', '2026-10-06 00:52:47'),
('MT-261006014700', 'HV-000003', 'Inspection', 'Physical Inspection: Presence of Queen Cells', '2026-10-06', '2026-10-06 09:47:00'),
('MT-261006014710', 'HV-000003', 'Inspection', 'Physical Inspection: Reduction of Open Brood', '2026-10-06', '2026-10-06 09:47:10')
-- @@END@@

-- Table `messages`
DROP TABLE IF EXISTS `messages`
-- @@END@@
CREATE TABLE `messages` (
  `message_id` int NOT NULL AUTO_INCREMENT,
  `chat_id` int NOT NULL,
  `sender_role` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message_type` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'text',
  `message_content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `image_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `live_until` timestamp NULL DEFAULT NULL,
  `location_updated_at` timestamp NULL DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `sent_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`message_id`),
  KEY `fk_messages_chat` (`chat_id`),
  CONSTRAINT `fk_messages_chat` FOREIGN KEY (`chat_id`) REFERENCES `chats` (`chat_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_messages_image_url` CHECK (((`message_type` <> _utf8mb3'image') or (`image_url` is not null))),
  CONSTRAINT `chk_messages_location_coords` CHECK (((`message_type` <> _utf8mb3'location') or ((`latitude` is not null) and (`longitude` is not null)))),
  CONSTRAINT `chk_messages_sender_role` CHECK ((`sender_role` in (_utf8mb3'Beekeeper',_utf8mb3'Citizen'))),
  CONSTRAINT `chk_messages_type` CHECK ((`message_type` in (_utf8mb3'text',_utf8mb3'location',_utf8mb3'image')))
) ENGINE=InnoDB AUTO_INCREMENT=93 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `messages` (`message_id`, `chat_id`, `sender_role`, `message_type`, `message_content`, `image_url`, `latitude`, `longitude`, `live_until`, `location_updated_at`, `is_read`, `sent_at`) VALUES
(3, 2, 'Beekeeper', 'text', 'hello po willing to rescue the bees po', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-01 19:58:40'),
(4, 2, 'Beekeeper', 'text', 'hello po willing to rescue the bees po', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-01 19:59:10'),
(5, 2, 'Citizen', 'text', 'Okay ill check your offer po', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-01 20:00:45'),
(6, 2, 'Citizen', 'text', 'Okay ill check your offer po', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-01 20:01:32'),
(7, 3, 'Citizen', 'text', 'Miss kelya', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-01 20:15:26'),
(8, 3, 'Beekeeper', 'text', 'hi', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-01 20:17:56'),
(9, 3, 'Beekeeper', 'text', 'chinat ko to 8:17', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-01 20:18:04'),
(10, 3, 'Beekeeper', 'text', 'ano oras mo nakita', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-01 20:18:25'),
(11, 3, 'Citizen', 'image', 'Sent a photo', 'd1a362aa3f11465da63d8886e40c8afa.jpg', NULL, NULL, NULL, NULL, 1, '2026-10-01 20:28:05'),
(12, 3, 'Citizen', 'text', 'Okay lang po i-report ko si jollibee?', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-01 20:28:29'),
(13, 3, 'Citizen', 'text', 'test kung mabilis', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-02 09:00:58'),
(14, 3, 'Beekeeper', 'text', 'hu', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-02 17:01:34'),
(15, 3, 'Beekeeper', 'text', 'hi', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-02 17:01:44'),
(16, 3, 'Beekeeper', 'text', 'Test', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-02 23:26:13'),
(17, 3, 'Beekeeper', 'text', 'test again 1', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-03 18:15:50'),
(18, 3, 'Beekeeper', 'text', 'hi', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-03 18:29:30'),
(19, 3, 'Beekeeper', 'text', 'hiii', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-03 18:29:42'),
(20, 3, 'Citizen', 'text', 'Hi', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-03 18:30:23'),
(21, 3, 'Beekeeper', 'text', 'hellooo', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-03 18:30:35'),
(22, 3, 'Citizen', 'text', 'Musta ka', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-03 18:30:42'),
(23, 3, 'Beekeeper', 'text', '6 30 ko to sinend what time mo kita', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-03 18:30:43'),
(24, 3, 'Beekeeper', 'text', 'ok lang ikaw musta nakahanap ka ba jollibee', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-03 18:30:57'),
(25, 3, 'Citizen', 'text', '6:30', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-03 18:31:18'),
(26, 3, 'Beekeeper', 'text', 'okay', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-03 18:41:51'),
(27, 3, 'Beekeeper', 'text', 'hi', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-03 18:47:09'),
(28, 3, 'Citizen', 'text', 'up', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-03 18:51:56'),
(29, 3, 'Beekeeper', 'text', 'up', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-03 18:51:59'),
(30, 3, 'Beekeeper', 'text', 'hi poooo', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-03 18:52:04'),
(31, 3, 'Beekeeper', 'text', 'T^T', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-03 18:52:08'),
(32, 3, 'Citizen', 'text', 'hello', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-03 18:52:11'),
(33, 3, 'Beekeeper', 'text', 'kumusta web app nyo?', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-03 18:52:24'),
(34, 3, 'Citizen', 'text', 'k lng', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-03 18:52:30'),
(35, 3, 'Beekeeper', 'text', 'ok', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-03 18:52:38'),
(36, 3, 'Citizen', 'text', 'bee ka ba?', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-03 18:52:49'),
(37, 3, 'Beekeeper', 'image', 'Sent a photo', 'c6fda078754e4121b0a06a228adeda5d.jpg', NULL, NULL, NULL, NULL, 1, '2026-10-03 18:53:03'),
(38, 3, 'Beekeeper', 'text', 'magkano po offer nyo?', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-03 18:53:09'),
(39, 3, 'Citizen', 'text', '50', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-03 18:53:26'),
(40, 3, 'Beekeeper', 'text', 'HAHAHAH sige palo', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-03 18:53:40'),
(41, 3, 'Beekeeper', 'text', 'bkt palo?', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-03 18:53:46'),
(42, 3, 'Beekeeper', 'text', 'thank you po', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-03 18:57:04'),
(43, 3, 'Citizen', 'text', 'ok, no worries', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-03 18:57:24'),
(44, 3, 'Beekeeper', 'text', 'send location', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-03 18:57:40'),
(45, 3, 'Beekeeper', 'text', 'eme', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-03 18:57:42'),
(46, 3, 'Citizen', 'location', 'Shared a live location', NULL, 14.60913243, 121.10911768, '2026-10-03 19:12:52', '2026-10-03 19:01:53', 1, '2026-10-03 18:57:52'),
(47, 3, 'Beekeeper', 'text', 'goodluck po sa parcel', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-03 18:58:13'),
(48, 3, 'Beekeeper', 'text', 'otw na', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-03 18:58:15'),
(49, 3, 'Citizen', 'text', 'wao ok po bee', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-03 18:58:33'),
(50, 3, 'Beekeeper', 'image', 'Sent a photo', '277cdb0ab02e4b93859c459eb38433c2.jpg', NULL, NULL, NULL, NULL, 1, '2026-10-03 18:58:53'),
(51, 3, 'Citizen', 'text', 'walang haha react', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-03 18:59:15'),
(52, 3, 'Beekeeper', 'text', 'sorry wala sa messages', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-03 19:01:47'),
(53, 3, 'Beekeeper', 'text', 'hello marvie to', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-03 19:06:47'),
(54, 3, 'Citizen', 'text', 'sino ka?', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-04 15:50:24'),
(55, 3, 'Citizen', 'location', 'Shared a location', NULL, 14.66014243, 121.02791048, NULL, '2026-10-04 15:51:05', 1, '2026-10-04 15:51:05'),
(56, 3, 'Beekeeper', 'image', 'Sent a photo', '317627e3a54d4e9f9c3952dba6095f6e.jpg', NULL, NULL, NULL, NULL, 1, '2026-10-04 15:59:02'),
(57, 3, 'Beekeeper', 'text', 'ito po pwede?', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-04 15:59:08'),
(58, 3, 'Beekeeper', 'text', 'test 1', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-04 15:59:38'),
(59, 3, 'Beekeeper', 'text', 'test 2', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-04 16:18:56'),
(60, 3, 'Citizen', 'text', 'Test 3', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-04 16:19:21'),
(61, 3, 'Beekeeper', 'text', 'test 4', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-04 16:19:50'),
(62, 3, 'Citizen', 'text', 'test 5', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-04 16:24:43'),
(63, 3, 'Citizen', 'text', 'notification test 1', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-04 16:30:24'),
(64, 3, 'Beekeeper', 'text', 'beh try nga natin na nakadata lang tayo', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-04 18:03:28'),
(65, 3, 'Beekeeper', 'text', 'mabilis pa rin ba', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-04 18:03:37'),
(66, 3, 'Beekeeper', 'text', 'mabilisss hahahaha sana may awa ang s511 huhu', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-04 18:03:51'),
(67, 3, 'Citizen', 'text', 'Sana nga may awa ang room', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-04 19:16:12'),
(68, 3, 'Citizen', 'text', 'HAHAHAHHAHAHA', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-04 19:16:14'),
(69, 4, 'Citizen', 'text', 'hello po', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-04 22:58:26'),
(70, 4, 'Citizen', 'image', 'Sent a photo', 'a919121f721a45848620946355db97cb.jpg', NULL, NULL, NULL, NULL, 1, '2026-10-04 22:59:40'),
(71, 4, 'Beekeeper', 'text', 'Hi', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-05 01:24:19'),
(72, 4, 'Beekeeper', 'text', 'Ano po gagawin?', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-05 01:24:31'),
(73, 6, 'Beekeeper', 'text', 'test notif 1', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-05 07:42:50'),
(74, 3, 'Citizen', 'text', 'Kellll T^T', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-05 10:53:30'),
(75, 4, 'Citizen', 'text', '...', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-05 11:43:26'),
(76, 4, 'Beekeeper', 'text', '...', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-05 15:00:16'),
(77, 4, 'Beekeeper', 'text', 'Hi po', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-05 15:00:21'),
(78, 4, 'Beekeeper', 'text', '?', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-05 15:00:26'),
(79, 3, 'Citizen', 'text', 'test message 1', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-13 15:33:28'),
(80, 3, 'Beekeeper', 'text', 'test message 2', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-13 15:49:46'),
(81, 3, 'Beekeeper', 'text', 'test message 3', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-13 15:50:38'),
(82, 3, 'Citizen', 'text', 'Ayaw mag notif', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-13 15:51:04'),
(83, 3, 'Beekeeper', 'text', 'haha', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-13 15:51:28'),
(84, 3, 'Citizen', 'image', 'Sent a photo', '983019505320421985f69d826e20b604.jpg', NULL, NULL, NULL, NULL, 1, '2026-10-13 15:52:45'),
(85, 3, 'Citizen', 'text', 'boss', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-13 15:57:56'),
(86, 3, 'Beekeeper', 'text', 'hi po', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-13 16:26:11'),
(87, 3, 'Beekeeper', 'text', 'ay', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-13 16:26:13'),
(88, 3, 'Beekeeper', 'text', 'bilis', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-13 16:26:15'),
(89, 3, 'Beekeeper', 'location', 'Shared a live location', NULL, 14.61414140, 121.15379740, '2026-10-13 16:41:42', '2026-10-13 16:27:42', 1, '2026-10-13 16:26:42'),
(90, 3, 'Citizen', 'text', 'Bilis no', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-13 16:27:41'),
(91, 3, 'Citizen', 'text', 'Wow nasa cloud 9', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-13 16:28:49'),
(92, 3, 'Beekeeper', 'text', 'oo HAHAHAHA', NULL, NULL, NULL, NULL, NULL, 0, '2026-10-13 22:45:32')
-- @@END@@

-- Table `notifications`
DROP TABLE IF EXISTS `notifications`
-- @@END@@
CREATE TABLE `notifications` (
  `notification_id` varchar(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `beekeeperID` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `citizenID` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `adminID` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `alert_id` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reportID` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `notification_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`notification_id`),
  KEY `fk_notifications_beekeeper` (`beekeeperID`),
  KEY `fk_notifications_alert` (`alert_id`),
  KEY `fk_notifications_report` (`reportID`),
  KEY `idx_notifications_citizen` (`citizenID`,`is_read`),
  KEY `idx_notifications_admin` (`adminID`,`is_read`),
  CONSTRAINT `fk_notifications_admin` FOREIGN KEY (`adminID`) REFERENCES `admins` (`adminID`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_notifications_alert` FOREIGN KEY (`alert_id`) REFERENCES `alerts` (`alert_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_notifications_beekeeper` FOREIGN KEY (`beekeeperID`) REFERENCES `beekeepers` (`beekeeperID`) ON UPDATE CASCADE,
  CONSTRAINT `fk_notifications_citizen` FOREIGN KEY (`citizenID`) REFERENCES `citizens` (`citizenID`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_notifications_report` FOREIGN KEY (`reportID`) REFERENCES `reports` (`reportID`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `notifications` (`notification_id`, `beekeeperID`, `citizenID`, `adminID`, `alert_id`, `reportID`, `title`, `message`, `notification_type`, `is_read`, `created_at`) VALUES
('NT-261001013057bb1bfc', NULL, NULL, 'ADM-000001', NULL, NULL, 'Verification Request', 'John Evans Lacuas Gutierrez (Happy Bee Farm) uploaded a Valid Government ID for verification.', 'verify_request', 0, '2026-10-01 09:30:57'),
('NT-261001013157eb914f', 'BKP-000001', NULL, NULL, NULL, NULL, 'Account Verified', 'Your beekeeper account has been verified. You can now view bee reports and send rescue offers.', 'verification', 1, '2026-10-01 09:31:57'),
('NT-26100102064603967f', 'BKP-000001', NULL, NULL, NULL, NULL, 'Alert Submitted', 'Your pesticide alert \"Fungicide Application\" was sent to the admin for review. It will be shown to other beekeepers once it\'s approved.', 'pesticide_alert', 1, '2026-10-01 10:06:46'),
('NT-261001020648580624', NULL, NULL, 'ADM-000001', NULL, NULL, 'Alert Needs Approval', 'John Evans Lacuas Gutierrez reported Fungicide spraying at Vasra, Quezon City. Approve or reject it.', 'alert_review', 0, '2026-10-01 10:06:48'),
('NT-261001094438d32361', 'BKP-000001', NULL, NULL, NULL, 'RPT-000007', 'New Bee Rescue Report', 'Apis mellifera (Western Honey Bee) was reported 18.5 km from your farm. Tap to view it and make an offer.', 'rescue_report', 0, '2026-10-01 17:44:38'),
('NT-261001094440ca3b1c', NULL, NULL, 'ADM-000001', NULL, 'RPT-000007', 'New Swarm Report', 'A citizen reported Apis mellifera (Western Honey Bee). Tap to view report RPT-000007.', 'new_report', 0, '2026-10-01 17:44:40'),
('NT-261001095703777e34', 'BKP-000001', NULL, NULL, NULL, 'RPT-000008', 'New Bee Rescue Report', 'Apis mellifera (Western Honey Bee) was reported 18.8 km from your farm. Tap to view it and make an offer.', 'rescue_report', 0, '2026-10-01 17:57:03'),
('NT-261001095705f081ec', NULL, NULL, 'ADM-000001', NULL, 'RPT-000008', 'New Swarm Report', 'A citizen reported Apis mellifera (Western Honey Bee). Tap to view report RPT-000008.', 'new_report', 0, '2026-10-01 17:57:05'),
('NT-261001105012f52e73', 'BKP-000002', NULL, NULL, NULL, NULL, 'Queen Replacement Recommended', 'HV-000004: Queen age exceeded 730 days (currently 963 days).', 'queen_recommendation', 0, '2026-10-01 18:50:12'),
('NT-261001105117136bb5', 'BKP-000002', NULL, NULL, NULL, NULL, 'Queen Replacement Recommended', 'HV-000005: Queen age exceeded 730 days (currently 963 days).', 'queen_recommendation', 0, '2026-10-01 18:51:17'),
('NT-261001105735a94f18', 'BKP-000002', NULL, NULL, NULL, NULL, 'Queen Replacement Recommended', 'HV-000008: Hive is currently marked \'Weak\' — queen replacement recommended.', 'queen_recommendation', 0, '2026-10-01 18:57:35'),
('NT-261001110010637922', 'BKP-000002', NULL, NULL, NULL, NULL, 'Queen Replacement Recommended', 'HV-000001: Hive is currently marked \'Needs Attention\' — queen replacement recommended.', 'queen_recommendation', 0, '2026-10-01 19:00:10'),
('NT-261001111531866d91', NULL, NULL, 'ADM-000001', NULL, NULL, 'Verification Request', 'Kelia Audrey Solis Gamayo (KeliVille) uploaded a Valid Government ID for verification.', 'verify_request', 0, '2026-10-01 19:15:31'),
('NT-261001112231601458', 'BKP-000002', NULL, NULL, NULL, NULL, 'Queen Replacement Recommended', 'HV-000002: Hive is currently marked \'Weak\' — queen replacement recommended.', 'queen_recommendation', 0, '2026-10-01 19:22:32'),
('NT-26100111260733c0b3', 'BKP-000002', NULL, NULL, NULL, NULL, 'Queen Replacement Recommended', 'HV-000007: Hive is currently marked \'Weak\' — queen replacement recommended.', 'queen_recommendation', 0, '2026-10-01 19:26:07'),
('NT-261001113428ae4ac8', 'BKP-000001', NULL, NULL, NULL, NULL, 'Alert Approved', 'Your pesticide alert \"Fungicide Application\" was approved by the admin and sent to 1 beekeeper(s). None of them are inside the 3.0 km danger radius. Your own apiary is approx. 18.50 km from the site (risk level: Low).', 'pesticide_alert', 0, '2026-10-01 19:34:29'),
('NT-261001113428ff408b', 'BKP-000002', NULL, NULL, NULL, NULL, 'Pesticide Alert: Fungicide Application', 'A Fungicide application (reported by a fellow beekeeper (John Evans Lacuas Gutierrez)) has been posted in your area. Your apiary is outside the 3.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-01 19:34:28'),
('NT-26100111362445a1f5', 'BKP-000002', NULL, NULL, NULL, NULL, 'Account Verified', 'Your beekeeper account has been verified. You can now view bee reports and send rescue offers.', 'verification', 0, '2026-10-01 19:36:24'),
('NT-26100111392622b831', 'BKP-000002', NULL, NULL, NULL, NULL, 'Pesticide Alert: Fungicide Application', 'A Fungicide application (issued) has been posted in your area. Your apiary is outside the 3.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-01 19:39:26'),
('NT-261001113926c69c92', 'BKP-000001', NULL, NULL, NULL, NULL, 'Pesticide Alert: Fungicide Application', 'A Fungicide application (issued) has been posted in your area. Your apiary is outside the 3.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-01 19:39:26'),
('NT-261001114003548093', 'BKP-000002', NULL, NULL, NULL, NULL, 'Pesticide Alert: Fungicide Application', 'A Fungicide application (issued) is scheduled within 3.0 km of your apiary (approx. 0.00 km away). Risk level: High.', 'pesticide_alert', 0, '2026-10-01 19:40:03'),
('NT-2610011140044e02c2', 'BKP-000001', NULL, NULL, NULL, NULL, 'Pesticide Alert: Fungicide Application', 'A Fungicide application (issued) has been posted in your area. Your apiary is outside the 3.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-01 19:40:04'),
('NT-26100111413910294e', 'BKP-000002', NULL, NULL, NULL, NULL, 'Pesticide Alert: Herbicide Application', 'A Herbicide application (issued) has been posted in your area. Your apiary is outside the 3.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-01 19:41:39'),
('NT-261001114139b90101', 'BKP-000001', NULL, NULL, NULL, NULL, 'Pesticide Alert: Herbicide Application', 'A Herbicide application (issued) has been posted in your area. Your apiary is outside the 3.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-01 19:41:39'),
('NT-26100111425227f7a5', 'BKP-000002', NULL, NULL, NULL, NULL, 'Pesticide Alert: Fungicide Application', 'A Fungicide application (issued) is scheduled within 3.0 km of your apiary (approx. 2.42 km away). Risk level: Low.', 'pesticide_alert', 0, '2026-10-01 19:42:52'),
('NT-261001114253a9067b', 'BKP-000001', NULL, NULL, NULL, NULL, 'Pesticide Alert: Fungicide Application', 'A Fungicide application (issued) has been posted in your area. Your apiary is outside the 3.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-01 19:42:53'),
('NT-2610011144140cbcfa', 'BKP-000002', NULL, NULL, NULL, NULL, 'Pesticide Alert: Insecticide Application', 'A Insecticide application (issued) is scheduled within 5.0 km of your apiary (approx. 4.63 km away). Risk level: Low.', 'pesticide_alert', 0, '2026-10-01 19:44:14'),
('NT-261001114415754fb9', 'BKP-000001', NULL, NULL, NULL, NULL, 'Pesticide Alert: Insecticide Application', 'A Insecticide application (issued) has been posted in your area. Your apiary is outside the 5.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-01 19:44:15'),
('NT-261001115049001629', 'BKP-000001', NULL, NULL, NULL, NULL, 'Pesticide Alert: Fungicide Application', 'A Fungicide application (issued) has been posted in your area. Your apiary is outside the 3.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-01 19:50:49'),
('NT-261001115049c0f233', 'BKP-000002', NULL, NULL, NULL, NULL, 'Pesticide Alert: Fungicide Application', 'A Fungicide application (issued) has been posted in your area. Your apiary is outside the 3.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-01 19:50:50'),
('NT-2610011153576967f2', NULL, 'CTZ-000001', NULL, NULL, 'RPT-000007', 'New Rescue Offer', 'Kelia Audrey Solis Gamayo offered PHP 300 for report RPT-000007. Tap to view and accept or reject it.', 'rescue_offer', 0, '2026-10-01 19:53:57'),
('NT-2610011158126f6995', 'BKP-000001', NULL, NULL, NULL, NULL, 'Pesticide Alert: Insecticide Application', 'A Insecticide application (issued) is scheduled within 5.0 km of your apiary (approx. 2.45 km away). Risk level: Medium.', 'pesticide_alert', 0, '2026-10-01 19:58:12'),
('NT-26100111581358eb21', 'BKP-000002', NULL, NULL, NULL, NULL, 'Pesticide Alert: Insecticide Application', 'A Insecticide application (issued) has been posted in your area. Your apiary is outside the 5.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-01 19:58:13'),
('NT-2610011200140d5db1', 'BKP-000001', NULL, NULL, NULL, NULL, 'Pesticide Alert: Insecticide Application', 'A Insecticide application (issued) is scheduled within 5.0 km of your apiary (approx. 2.18 km away). Risk level: Medium.', 'pesticide_alert', 0, '2026-10-01 20:00:14'),
('NT-2610011200156956ca', 'BKP-000002', NULL, NULL, NULL, NULL, 'Pesticide Alert: Insecticide Application', 'A Insecticide application (issued) has been posted in your area. Your apiary is outside the 5.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 1, '2026-10-01 20:00:15'),
('NT-261001120200e512a0', 'BKP-000001', NULL, NULL, NULL, NULL, 'Pesticide Alert: Pesticide Application', 'A pesticide application (issued) is scheduled within 3.0 km of your apiary (approx. 2.15 km away). Risk level: Low.', 'pesticide_alert', 0, '2026-10-01 20:02:00'),
('NT-2610011202013749fe', 'BKP-000002', NULL, NULL, NULL, NULL, 'Pesticide Alert: Pesticide Application', 'A pesticide application (issued) has been posted in your area. Your apiary is outside the 3.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 1, '2026-10-01 20:02:01'),
('NT-26100112031264e5d2', 'BKP-000001', NULL, NULL, NULL, NULL, 'Pesticide Alert: Insecticide Application', 'A Insecticide application (issued) is scheduled within 5.0 km of your apiary (approx. 2.15 km away). Risk level: Medium.', 'pesticide_alert', 0, '2026-10-01 20:03:12'),
('NT-261001120313e94e4c', 'BKP-000002', NULL, NULL, NULL, NULL, 'Pesticide Alert: Insecticide Application', 'A Insecticide application (issued) has been posted in your area. Your apiary is outside the 5.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 1, '2026-10-01 20:03:13'),
('NT-26100112125679d55e', 'BKP-000002', NULL, NULL, NULL, 'RPT-000007', 'Offer Accepted!', 'The citizen accepted your offer on report RPT-000007. Message them to arrange the rescue.', 'offer_update', 0, '2026-10-01 20:12:56'),
('NT-2610011236010f871b', 'BKP-000001', NULL, NULL, NULL, 'RPT-000009', 'New Bee Rescue Report', 'Apis mellifera (Western Honey Bee) was reported 18.3 km from your farm. Tap to view it and make an offer.', 'rescue_report', 0, '2026-10-01 20:36:01'),
('NT-26100112360295f07f', 'BKP-000002', NULL, NULL, NULL, 'RPT-000009', 'New Bee Rescue Report', 'Apis mellifera (Western Honey Bee) was reported 6.2 km from your farm. Tap to view it and make an offer.', 'rescue_report', 0, '2026-10-01 20:36:02'),
('NT-261001123604bb9c25', NULL, NULL, 'ADM-000001', NULL, 'RPT-000009', 'New Swarm Report', 'A citizen reported Apis mellifera (Western Honey Bee). Tap to view report RPT-000009.', 'new_report', 0, '2026-10-01 20:36:04'),
('NT-26100112384159d441', 'BKP-000002', NULL, NULL, NULL, 'RPT-000010', 'New Bee Rescue Report', 'Apis cerana (Asian Honey Bee) was reported 8.8 km from your farm. Tap to view it and make an offer.', 'rescue_report', 0, '2026-10-01 20:38:41'),
('NT-261001123841d3e712', 'BKP-000001', NULL, NULL, NULL, 'RPT-000010', 'New Bee Rescue Report', 'Apis cerana (Asian Honey Bee) was reported 27.6 km from your farm. Tap to view it and make an offer.', 'rescue_report', 0, '2026-10-01 20:38:41'),
('NT-261001123843d1efb0', NULL, NULL, 'ADM-000001', NULL, 'RPT-000010', 'New Swarm Report', 'A citizen reported Apis cerana (Asian Honey Bee). Tap to view report RPT-000010.', 'new_report', 0, '2026-10-01 20:38:43'),
('NT-2610011314142ce8b2', 'BKP-000001', NULL, NULL, NULL, 'RPT-000011', 'New Bee Rescue Report', 'Apis cerana (Asian Honey Bee) was reported 18.6 km from your farm. Tap to view it and make an offer.', 'rescue_report', 0, '2026-10-01 21:14:14'),
('NT-261001131414bccb8a', 'BKP-000002', NULL, NULL, NULL, 'RPT-000011', 'New Bee Rescue Report', 'Apis cerana (Asian Honey Bee) was reported 19.2 km from your farm. Tap to view it and make an offer.', 'rescue_report', 0, '2026-10-01 21:14:14'),
('NT-2610011314162fa557', NULL, NULL, 'ADM-000001', NULL, 'RPT-000011', 'New Swarm Report', 'A citizen reported Apis cerana (Asian Honey Bee). Tap to view report RPT-000011.', 'new_report', 0, '2026-10-01 21:14:16'),
('NT-26100113210552cf1f', 'BKP-000002', NULL, NULL, NULL, 'RPT-000012', 'New Bee Rescue Report', 'Apis cerana (Asian Honey Bee) was reported 5.2 km from your farm. Tap to view it and make an offer.', 'rescue_report', 0, '2026-10-01 21:21:05'),
('NT-2610011321056dc4cf', 'BKP-000001', NULL, NULL, NULL, 'RPT-000012', 'New Bee Rescue Report', 'Apis cerana (Asian Honey Bee) was reported 25.3 km from your farm. Tap to view it and make an offer.', 'rescue_report', 0, '2026-10-01 21:21:05'),
('NT-261001132107087e42', NULL, NULL, 'ADM-000001', NULL, 'RPT-000012', 'New Swarm Report', 'A citizen reported Apis cerana (Asian Honey Bee). Tap to view report RPT-000012.', 'new_report', 0, '2026-10-01 21:21:07'),
('NT-261001133102bbb764', NULL, 'CTZ-000003', NULL, NULL, 'RPT-000012', 'New Rescue Offer', 'Kelia Audrey Solis Gamayo offered PHP 100 for report RPT-000012. Tap to view and accept or reject it.', 'rescue_offer', 1, '2026-10-01 21:31:02'),
('NT-26100215404017c6f4', 'BKP-000002', NULL, NULL, NULL, 'RPT-000013', 'New Bee Rescue Report', 'Apis mellifera (Western Honey Bee) was reported 19.4 km from your farm. Tap to view it and make an offer.', 'rescue_report', 0, '2026-10-02 23:40:40'),
('NT-2610021540406bf958', 'BKP-000001', NULL, NULL, NULL, 'RPT-000013', 'New Bee Rescue Report', 'Apis mellifera (Western Honey Bee) was reported 20.0 km from your farm. Tap to view it and make an offer.', 'rescue_report', 0, '2026-10-02 23:40:40'),
('NT-261002154043e8172e', NULL, NULL, 'ADM-000001', NULL, 'RPT-000013', 'New Swarm Report', 'A citizen reported Apis mellifera (Western Honey Bee). It may be dangerous. Tap to view report RPT-000013.', 'new_report', 0, '2026-10-02 23:40:43'),
('NT-261002211125949e39', NULL, 'CTZ-000002', NULL, NULL, 'RPT-000013', 'New Rescue Offer', 'John Evans Lacuas Gutierrez offered PHP 100 for report RPT-000013. Tap to view and accept or reject it.', 'rescue_offer', 1, '2026-10-03 05:11:25'),
('NT-261002212057594482', 'BKP-000001', NULL, NULL, NULL, 'RPT-000014', 'New Bee Rescue Report', 'Apis mellifera (Western Honey Bee) was reported 18.0 km from your farm. Tap to view it and make an offer.', 'rescue_report', 0, '2026-10-03 05:20:57'),
('NT-261002212057d75dd4', 'BKP-000002', NULL, NULL, NULL, 'RPT-000014', 'New Bee Rescue Report', 'Apis mellifera (Western Honey Bee) was reported 6.5 km from your farm. Tap to view it and make an offer.', 'rescue_report', 0, '2026-10-03 05:20:57'),
('NT-2610022120593f6c40', NULL, NULL, 'ADM-000001', NULL, 'RPT-000014', 'New Swarm Report', 'A citizen reported Apis mellifera (Western Honey Bee). It may be dangerous. Tap to view report RPT-000014.', 'new_report', 0, '2026-10-03 05:20:59'),
('NT-26100221211204d7da', 'BKP-000001', NULL, NULL, NULL, 'RPT-000015', 'New Bee Rescue Report', 'Apis mellifera (Western Honey Bee) was reported 18.4 km from your farm. Tap to view it and make an offer.', 'rescue_report', 0, '2026-10-03 05:21:12'),
('NT-261002212112cea24d', 'BKP-000002', NULL, NULL, NULL, 'RPT-000015', 'New Bee Rescue Report', 'Apis mellifera (Western Honey Bee) was reported 5.9 km from your farm. Tap to view it and make an offer.', 'rescue_report', 0, '2026-10-03 05:21:13'),
('NT-26100221211578a411', NULL, NULL, 'ADM-000001', NULL, 'RPT-000015', 'New Swarm Report', 'A citizen reported Apis mellifera (Western Honey Bee). It may be dangerous. Tap to view report RPT-000015.', 'new_report', 0, '2026-10-03 05:21:15'),
('NT-261003105412529a8c', NULL, 'CTZ-000002', NULL, NULL, 'RPT-000013', 'New Rescue Offer', 'Kelia Audrey Solis Gamayo offered PHP 150 for report RPT-000013. Tap to view and accept or reject it.', 'rescue_offer', 0, '2026-10-03 18:54:12'),
('NT-26100310542287277a', 'BKP-000001', NULL, NULL, NULL, 'RPT-000013', 'Offer Not Accepted', 'The citizen chose another beekeeper for report RPT-000013.', 'offer_update', 0, '2026-10-03 18:54:22'),
('NT-261003105422a11287', 'BKP-000002', NULL, NULL, NULL, 'RPT-000013', 'Offer Accepted!', 'The citizen accepted your offer on report RPT-000013. Message them to arrange the rescue.', 'offer_update', 0, '2026-10-03 18:54:22'),
('NT-261003105557ae806a', 'BKP-000002', NULL, NULL, NULL, 'RPT-000013', 'Rescue Resolved', 'The citizen marked the rescue for report RPT-000013 as resolved. Thank you for helping the bees!', 'rescue_resolved', 0, '2026-10-03 18:55:57'),
('NT-261003130207a7f7c6', 'BKP-000001', NULL, NULL, NULL, 'RPT-000016', 'New Bee Rescue Report', 'Apis cerana (Asian Honey Bee) was reported 18.8 km from your farm. Tap to view it and make an offer.', 'rescue_report', 0, '2026-10-03 21:02:07'),
('NT-261003130207b2eb0f', NULL, NULL, 'ADM-000001', NULL, 'RPT-000016', 'New Swarm Report', 'A citizen reported Apis cerana (Asian Honey Bee). Tap to view report RPT-000016.', 'new_report', 0, '2026-10-03 21:02:07'),
('NT-261003130207c7098d', 'BKP-000002', NULL, NULL, NULL, 'RPT-000016', 'New Bee Rescue Report', 'Apis cerana (Asian Honey Bee) was reported 5.7 km from your farm. Tap to view it and make an offer.', 'rescue_report', 0, '2026-10-03 21:02:07'),
('NT-261003130338d27e55', NULL, 'CTZ-000002', NULL, NULL, 'RPT-000016', 'New Rescue Offer', 'Kelia Audrey Solis Gamayo offered PHP 300 for report RPT-000016. Tap to view and accept or reject it.', 'rescue_offer', 0, '2026-10-03 21:03:38'),
('NT-2610031305068e4e7c', 'BKP-000002', NULL, NULL, NULL, 'RPT-000016', 'Offer Accepted!', 'The citizen accepted your offer on report RPT-000016. Message them to arrange the rescue.', 'offer_update', 0, '2026-10-03 21:05:06'),
('NT-261003131532212b71', 'BKP-000002', NULL, NULL, NULL, 'RPT-000017', 'New Bee Rescue Report', 'Apis cerana (Asian Honey Bee) was reported 5.7 km from your farm. Tap to view it and make an offer.', 'rescue_report', 0, '2026-10-03 21:15:32'),
('NT-261003131532d2edc3', 'BKP-000001', NULL, NULL, NULL, 'RPT-000017', 'New Bee Rescue Report', 'Apis cerana (Asian Honey Bee) was reported 18.8 km from your farm. Tap to view it and make an offer.', 'rescue_report', 0, '2026-10-03 21:15:32'),
('NT-261003131532ee5325', NULL, NULL, 'ADM-000001', NULL, 'RPT-000017', 'New Swarm Report', 'A citizen reported Apis cerana (Asian Honey Bee). Tap to view report RPT-000017.', 'new_report', 0, '2026-10-03 21:15:32'),
('NT-26100313162768044f', NULL, NULL, 'ADM-000001', NULL, 'RPT-000018', 'New Swarm Report', 'A citizen reported Apis cerana (Asian Honey Bee). Tap to view report RPT-000018.', 'new_report', 0, '2026-10-03 21:16:27'),
('NT-261003131627a4e131', 'BKP-000002', NULL, NULL, NULL, 'RPT-000018', 'New Bee Rescue Report', 'Apis cerana (Asian Honey Bee) was reported 6.2 km from your farm. Tap to view it and make an offer.', 'rescue_report', 1, '2026-10-03 21:16:27'),
('NT-261003131627eb24cc', 'BKP-000001', NULL, NULL, NULL, 'RPT-000018', 'New Bee Rescue Report', 'Apis cerana (Asian Honey Bee) was reported 18.3 km from your farm. Tap to view it and make an offer.', 'rescue_report', 0, '2026-10-03 21:16:27'),
('NT-261003131715e030ee', NULL, 'CTZ-000002', NULL, NULL, 'RPT-000018', 'New Rescue Offer', 'Kelia Audrey Solis Gamayo offered PHP 400 for report RPT-000018. Tap to view and accept or reject it.', 'rescue_offer', 1, '2026-10-03 21:17:15'),
('NT-26100408241741e442', 'BKP-000001', NULL, NULL, NULL, 'RPT-000019', 'New Bee Rescue Report', 'Apis cerana (Asian Honey Bee) was reported 18.8 km from your farm. Tap to view it and make an offer.', 'rescue_report', 0, '2026-10-04 16:24:17'),
('NT-261004082417893ca1', NULL, NULL, 'ADM-000001', NULL, 'RPT-000019', 'New Swarm Report', 'A citizen reported Apis cerana (Asian Honey Bee). Tap to view report RPT-000019.', 'new_report', 0, '2026-10-04 16:24:17'),
('NT-261004082417dc1795', 'BKP-000002', NULL, NULL, NULL, 'RPT-000019', 'New Bee Rescue Report', 'Apis cerana (Asian Honey Bee) was reported 5.8 km from your farm. Tap to view it and make an offer.', 'rescue_report', 0, '2026-10-04 16:24:17'),
('NT-2610041224219c9de6', NULL, NULL, 'ADM-000001', NULL, NULL, 'Verification Request', 'Jan Marc Soberano Jacolbia (Zhaix the bee) uploaded a QCitizen ID for verification.', 'verify_request', 0, '2026-10-04 20:24:21'),
('NT-26100415074999d90c', 'BKP-000002', NULL, NULL, NULL, 'RPT-000012', 'Offer Accepted!', 'The citizen accepted your offer on report RPT-000012. Message them to arrange the rescue.', 'offer_update', 1, '2026-10-04 23:07:49'),
('NT-2610041527046f3e14', 'BKP-000001', NULL, NULL, NULL, NULL, 'Alert Submitted', 'Your pesticide alert \"Fungicide Application\" was sent to the admin for review. It will be shown to other beekeepers once it\'s approved.', 'pesticide_alert', 0, '2026-10-04 23:27:04'),
('NT-261004152704840906', NULL, NULL, 'ADM-000001', NULL, NULL, 'Alert Needs Approval', 'John Evans Lacuas Gutierrez reported Fungicide spraying at Payatas, Quezon City. Approve or reject it.', 'alert_review', 0, '2026-10-04 23:27:04'),
('NT-261004173305da2f0d', NULL, 'CTZ-000002', NULL, NULL, 'RPT-000019', 'New Rescue Offer', 'John Evans Lacuas Gutierrez offered PHP 400 for report RPT-000019. Tap to view and accept or reject it.', 'rescue_offer', 0, '2026-10-05 01:33:05'),
('NT-261005102701178a8d', 'BKP-000002', NULL, NULL, NULL, 'RPT-000020', 'New Bee Rescue Report', 'Apis cerana (Asian Honey Bee) was reported 5.8 km from your farm. Tap to view it and make an offer.', 'rescue_report', 0, '2026-10-05 18:27:01'),
('NT-26100510270171b7b3', NULL, NULL, 'ADM-000001', NULL, 'RPT-000020', 'New Swarm Report', 'A citizen reported Apis cerana (Asian Honey Bee). Tap to view report RPT-000020.', 'new_report', 0, '2026-10-05 18:27:01'),
('NT-261005102701be08da', 'BKP-000001', NULL, NULL, NULL, 'RPT-000020', 'New Bee Rescue Report', 'Apis cerana (Asian Honey Bee) was reported 18.8 km from your farm. Tap to view it and make an offer.', 'rescue_report', 0, '2026-10-05 18:27:01'),
('NT-2610051049291a49a7', 'BKP-000002', NULL, NULL, NULL, NULL, 'Alert Submitted', 'Your pesticide alert \"Fungicide Application\" was sent to the admin for review. It will be shown to other beekeepers once it\'s approved.', 'pesticide_alert', 0, '2026-10-05 18:49:29'),
('NT-261005104929c5cf11', NULL, NULL, 'ADM-000001', NULL, NULL, 'Alert Needs Approval', 'Kelia Audrey Solis Gamayo reported Fungicide spraying at Santa Monica, Quezon City. Approve or reject it.', 'alert_review', 0, '2026-10-05 18:49:29'),
('NT-261005105456381fd8', 'BKP-000002', NULL, NULL, NULL, NULL, 'Pesticide Alert: Herbicide Application', 'A Herbicide application (issued) has been posted in your area. Your apiary is outside the 3.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-05 18:54:56'),
('NT-2610051054565b89ad', 'BKP-000001', NULL, NULL, NULL, NULL, 'Pesticide Alert: Herbicide Application', 'A Herbicide application (issued) has been posted in your area. Your apiary is outside the 3.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-05 18:54:56'),
('NT-261005105456c2f372', 'BKP-000003', NULL, NULL, NULL, NULL, 'Pesticide Alert: Herbicide Application', 'A Herbicide application (issued) is scheduled within 3.0 km of your apiary (approx. 0.15 km away). Risk level: High.', 'pesticide_alert', 0, '2026-10-05 18:54:56'),
('NT-261005110339de1bce', NULL, NULL, 'ADM-000001', NULL, NULL, 'Alert Needs Approval', 'John Evans Lacuas Gutierrez reported pesticide spraying at Moonwalk, Parañaque. Approve or reject it.', 'alert_review', 0, '2026-10-05 19:03:39'),
('NT-261005110339defb34', 'BKP-000001', NULL, NULL, NULL, NULL, 'Alert Submitted', 'Your pesticide alert \"Pesticide Application\" was sent to the admin for review. It will be shown to other beekeepers once it\'s approved.', 'pesticide_alert', 0, '2026-10-05 19:03:39'),
('NT-26100511053220c657', 'BKP-000002', NULL, NULL, NULL, NULL, 'Pesticide Alert: Insecticide Application', 'A Insecticide application (issued) has been posted in your area. Your apiary is outside the 5.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-05 19:05:32'),
('NT-261005110532482285', 'BKP-000001', NULL, NULL, NULL, NULL, 'Pesticide Alert: Insecticide Application', 'A Insecticide application (issued) is scheduled within 5.0 km of your apiary (approx. 0.01 km away). Risk level: High.', 'pesticide_alert', 0, '2026-10-05 19:05:32'),
('NT-261005110532b19075', 'BKP-000003', NULL, NULL, NULL, NULL, 'Pesticide Alert: Insecticide Application', 'A Insecticide application (issued) has been posted in your area. Your apiary is outside the 5.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-05 19:05:32'),
('NT-261005110916092040', 'BKP-000002', NULL, NULL, NULL, NULL, 'Pesticide Alert: Insecticide Application', 'A Insecticide application (issued) has been posted in your area. Your apiary is outside the 5.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-05 19:09:16'),
('NT-261005110916a308c9', 'BKP-000003', NULL, NULL, NULL, NULL, 'Pesticide Alert: Insecticide Application', 'A Insecticide application (issued) has been posted in your area. Your apiary is outside the 5.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-05 19:09:16'),
('NT-261005110916f261da', 'BKP-000001', NULL, NULL, NULL, NULL, 'Pesticide Alert: Insecticide Application', 'A Insecticide application (issued) is scheduled within 5.0 km of your apiary (approx. 1.53 km away). Risk level: High.', 'pesticide_alert', 0, '2026-10-05 19:09:16'),
('NT-26100511413521ed0f', NULL, NULL, 'ADM-000001', NULL, 'RPT-000021', 'New Swarm Report', 'A citizen reported Apis mellifera (Western Honey Bee). Tap to view report RPT-000021.', 'new_report', 0, '2026-10-05 19:41:35'),
('NT-261005114135d9cb80', 'BKP-000002', NULL, NULL, NULL, 'RPT-000021', 'New Bee Rescue Report', 'Apis mellifera (Western Honey Bee) was reported 5.8 km from your farm. Tap to view it and make an offer.', 'rescue_report', 0, '2026-10-05 19:41:35'),
('NT-261005114135fa9b1b', 'BKP-000001', NULL, NULL, NULL, 'RPT-000021', 'New Bee Rescue Report', 'Apis mellifera (Western Honey Bee) was reported 18.8 km from your farm. Tap to view it and make an offer.', 'rescue_report', 0, '2026-10-05 19:41:35'),
('NT-26100512235970d8f6', 'BKP-000002', NULL, NULL, NULL, NULL, 'Pesticide Alert: Insecticide Application', 'A Insecticide application (issued) is scheduled within 5.0 km of your apiary (approx. 2.05 km away). Risk level: Medium.', 'pesticide_alert', 0, '2026-10-05 20:23:59'),
('NT-261005122359e169b2', 'BKP-000001', NULL, NULL, NULL, NULL, 'Pesticide Alert: Insecticide Application', 'A Insecticide application (issued) has been posted in your area. Your apiary is outside the 5.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-05 20:23:59'),
('NT-261005122359e97c97', 'BKP-000003', NULL, NULL, NULL, NULL, 'Pesticide Alert: Insecticide Application', 'A Insecticide application (issued) is scheduled within 5.0 km of your apiary (approx. 0.22 km away). Risk level: High.', 'pesticide_alert', 0, '2026-10-05 20:23:59'),
('NT-26100512252304915e', NULL, NULL, 'ADM-000001', NULL, NULL, 'Alert Needs Approval', 'Kelia Audrey Solis Gamayo reported Fungicide spraying at Santa Monica, Quezon City. Approve or reject it.', 'alert_review', 0, '2026-10-05 20:25:23'),
('NT-261005122523bae24b', 'BKP-000002', NULL, NULL, NULL, NULL, 'Alert Submitted', 'Your pesticide alert \"Fungicide Application\" was sent to the admin for review. It will be shown to other beekeepers once it\'s approved.', 'pesticide_alert', 0, '2026-10-05 20:25:23'),
('NT-26100514203142d27a', 'BKP-000002', NULL, NULL, 'ALT-000020', NULL, 'Alert Submitted', 'Your pesticide alert \"Fungicide Application\" was sent to the admin for review. It will be shown to other beekeepers once it\'s approved.', 'pesticide_alert', 0, '2026-10-05 22:20:31'),
('NT-261005142031bfea82', NULL, NULL, 'ADM-000001', 'ALT-000020', NULL, 'Alert Needs Approval', 'Kelia Audrey Solis Gamayo reported Fungicide spraying at Santa Monica, Quezon City. Approve or reject it.', 'alert_review', 0, '2026-10-05 22:20:31'),
('NT-26100514211630dbef', NULL, NULL, 'ADM-000001', 'ALT-000021', NULL, 'Alert Needs Approval', 'Kelia Audrey Solis Gamayo reported Fungicide spraying at 14.7174, 121.2331. Approve or reject it.', 'alert_review', 0, '2026-10-05 22:21:16'),
('NT-2610051421169dd8f1', 'BKP-000002', NULL, NULL, 'ALT-000021', NULL, 'Alert Submitted', 'Your pesticide alert \"Fungicide Application\" was sent to the admin for review. It will be shown to other beekeepers once it\'s approved.', 'pesticide_alert', 0, '2026-10-05 22:21:16'),
('NT-2610051421527c7f0e', NULL, NULL, 'ADM-000001', 'ALT-000022', NULL, 'Alert Needs Approval', 'Kelia Audrey Solis Gamayo reported Insecticide spraying at Vasra, Quezon City. Approve or reject it.', 'alert_review', 0, '2026-10-05 22:21:52'),
('NT-2610051421527ff414', 'BKP-000002', NULL, NULL, 'ALT-000022', NULL, 'Alert Submitted', 'Your pesticide alert \"Insecticide Application\" was sent to the admin for review. It will be shown to other beekeepers once it\'s approved.', 'pesticide_alert', 0, '2026-10-05 22:21:52'),
('NT-2610051423074a5150', NULL, NULL, 'ADM-000001', 'ALT-000023', NULL, 'Alert Needs Approval', 'Kelia Audrey Solis Gamayo reported Herbicide spraying at Bagumbong, Caloocan. Approve or reject it.', 'alert_review', 0, '2026-10-05 22:23:07'),
('NT-261005142307e4f0e8', 'BKP-000002', NULL, NULL, 'ALT-000023', NULL, 'Alert Submitted', 'Your pesticide alert \"Herbicide Application\" was sent to the admin for review. It will be shown to other beekeepers once it\'s approved.', 'pesticide_alert', 0, '2026-10-05 22:23:07'),
('NT-26100514243210e8de', 'BKP-000002', NULL, NULL, 'ALT-000024', NULL, 'Alert Submitted', 'Your pesticide alert \"Herbicide Application\" was sent to the admin for review. It will be shown to other beekeepers once it\'s approved.', 'pesticide_alert', 0, '2026-10-05 22:24:32'),
('NT-2610051424321b5832', NULL, NULL, 'ADM-000001', 'ALT-000024', NULL, 'Alert Needs Approval', 'Kelia Audrey Solis Gamayo reported Herbicide spraying at Tandang Sora, Quezon City. Approve or reject it.', 'alert_review', 0, '2026-10-05 22:24:32'),
('NT-2610051425310c4557', 'BKP-000003', NULL, NULL, 'ALT-000020', NULL, 'Pesticide Alert: Fungicide Application', 'A Fungicide application (reported by a fellow beekeeper (Kelia Audrey Solis Gamayo)) has been posted in your area. Your apiary is outside the 3.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-05 22:25:31'),
('NT-26100514253129563a', 'BKP-000001', NULL, NULL, 'ALT-000020', NULL, 'Pesticide Alert: Fungicide Application', 'A Fungicide application (reported by a fellow beekeeper (Kelia Audrey Solis Gamayo)) has been posted in your area. Your apiary is outside the 3.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-05 22:25:31'),
('NT-2610051425318edb23', 'BKP-000002', NULL, NULL, 'ALT-000020', NULL, 'Alert Approved', 'Your pesticide alert \"Fungicide Application\" was approved by the admin and sent to 2 beekeeper(s). None of them are inside the 3.0 km danger radius. Your own apiary is approx. 0.01 km from the site (risk level: High).', 'pesticide_alert', 0, '2026-10-05 22:25:31'),
('NT-26100514255905b62c', 'BKP-000002', NULL, NULL, 'ALT-000021', NULL, 'Alert Rejected', 'Your pesticide alert \"Fungicide Application\" was not approved. Reason: incomplete details', 'pesticide_alert', 0, '2026-10-05 22:25:59'),
('NT-2610051426060b3a4b', 'BKP-000001', NULL, NULL, 'ALT-000022', NULL, 'Pesticide Alert: Insecticide Application', 'A Insecticide application (reported by a fellow beekeeper (Kelia Audrey Solis Gamayo)) has been posted in your area. Your apiary is outside the 5.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-05 22:26:06'),
('NT-261005142606545cb0', 'BKP-000003', NULL, NULL, 'ALT-000022', NULL, 'Pesticide Alert: Insecticide Application', 'A Insecticide application (reported by a fellow beekeeper (Kelia Audrey Solis Gamayo)) is scheduled within 5.0 km of your apiary (approx. 1.98 km away). Risk level: Medium.', 'pesticide_alert', 0, '2026-10-05 22:26:06'),
('NT-261005142606dcaaa8', 'BKP-000002', NULL, NULL, 'ALT-000022', NULL, 'Alert Approved', 'Your pesticide alert \"Insecticide Application\" was approved by the admin and sent to 2 beekeeper(s). 1 of them are inside the 5.0 km danger radius. Your own apiary is approx. 0.05 km from the site (risk level: High).', 'pesticide_alert', 0, '2026-10-05 22:26:06'),
('NT-261005142610387d7f', 'BKP-000001', NULL, NULL, 'ALT-000023', NULL, 'Pesticide Alert: Herbicide Application', 'A Herbicide application (reported by a fellow beekeeper (Kelia Audrey Solis Gamayo)) has been posted in your area. Your apiary is outside the 3.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-05 22:26:10'),
('NT-26100514261077f651', 'BKP-000003', NULL, NULL, 'ALT-000023', NULL, 'Pesticide Alert: Herbicide Application', 'A Herbicide application (reported by a fellow beekeeper (Kelia Audrey Solis Gamayo)) has been posted in your area. Your apiary is outside the 3.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-05 22:26:10'),
('NT-261005142610d6fdcb', 'BKP-000002', NULL, NULL, 'ALT-000023', NULL, 'Alert Approved', 'Your pesticide alert \"Herbicide Application\" was approved by the admin and sent to 2 beekeeper(s). None of them are inside the 3.0 km danger radius. Your own apiary is approx. 5.15 km from the site (risk level: Low).', 'pesticide_alert', 0, '2026-10-05 22:26:10'),
('NT-2610051426130e48ae', 'BKP-000003', NULL, NULL, 'ALT-000024', NULL, 'Pesticide Alert: Herbicide Application', 'A Herbicide application (reported by a fellow beekeeper (Kelia Audrey Solis Gamayo)) is scheduled within 3.0 km of your apiary (approx. 2.31 km away). Risk level: Low.', 'pesticide_alert', 0, '2026-10-05 22:26:13'),
('NT-26100514261311a7fa', 'BKP-000001', NULL, NULL, 'ALT-000024', NULL, 'Pesticide Alert: Herbicide Application', 'A Herbicide application (reported by a fellow beekeeper (Kelia Audrey Solis Gamayo)) has been posted in your area. Your apiary is outside the 3.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-05 22:26:13'),
('NT-261005142613660dfc', 'BKP-000002', NULL, NULL, 'ALT-000024', NULL, 'Alert Approved', 'Your pesticide alert \"Herbicide Application\" was approved by the admin and sent to 2 beekeeper(s). 1 of them are inside the 3.0 km danger radius. Your own apiary is approx. 2.99 km from the site (risk level: Low).', 'pesticide_alert', 0, '2026-10-05 22:26:13'),
('NT-26100514271227f3dd', 'BKP-000002', NULL, NULL, 'ALT-000025', NULL, 'Pesticide Alert: Herbicide Application', 'A Herbicide application (issued) is scheduled within 3.0 km of your apiary (approx. 2.84 km away). Risk level: Low.', 'pesticide_alert', 0, '2026-10-05 22:27:12'),
('NT-261005142712e7fbd2', 'BKP-000003', NULL, NULL, 'ALT-000025', NULL, 'Pesticide Alert: Herbicide Application', 'A Herbicide application (issued) has been posted in your area. Your apiary is outside the 3.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-05 22:27:12'),
('NT-261005142712ee9bae', 'BKP-000001', NULL, NULL, 'ALT-000025', NULL, 'Pesticide Alert: Herbicide Application', 'A Herbicide application (issued) has been posted in your area. Your apiary is outside the 3.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-05 22:27:12'),
('NT-2610051446190be1a4', 'BKP-000003', NULL, NULL, NULL, NULL, 'Queen Replacement Recommended', 'HV-000018: Queen age exceeded 730 days (currently 764 days).', 'queen_recommendation', 0, '2026-10-05 22:46:19'),
('NT-261005144717f56a8e', 'BKP-000003', NULL, NULL, NULL, NULL, 'Queen Replacement Recommended', 'HV-000019: Queen age exceeded 730 days (currently 764 days).', 'queen_recommendation', 0, '2026-10-05 22:47:17'),
('NT-261005144827b54ce2', 'BKP-000003', NULL, NULL, NULL, NULL, 'Queen Replacement Recommended', 'HV-000020: Queen age exceeded 730 days (currently 764 days).', 'queen_recommendation', 0, '2026-10-05 22:48:27'),
('NT-2610051449265cd0b0', 'BKP-000003', NULL, NULL, NULL, NULL, 'Queen Replacement Recommended', 'HV-000021: Queen age exceeded 730 days (currently 764 days).', 'queen_recommendation', 0, '2026-10-05 22:49:26'),
('NT-261005150652c835d7', 'BKP-000002', NULL, NULL, NULL, NULL, 'Queen Replacement Recommended', 'HV-000024: Queen age exceeded 730 days (currently 887 days).', 'queen_recommendation', 0, '2026-10-05 23:06:52'),
('NT-2610051507120dc0b2', 'BKP-000002', NULL, NULL, NULL, NULL, 'Queen Replacement Recommended', 'HV-000024: Hive is currently marked \'Needs Attention\' — queen replacement recommended.', 'queen_recommendation', 0, '2026-10-05 23:07:12'),
('NT-261005151018541604', 'BKP-000002', NULL, NULL, 'ALT-000026', NULL, 'Pesticide Alert: Insecticide Application', 'A Insecticide application (issued) has been posted in your area. Your apiary is outside the 5.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-05 23:10:18'),
('NT-26100515101859859c', 'BKP-000001', NULL, NULL, 'ALT-000026', NULL, 'Pesticide Alert: Insecticide Application', 'A Insecticide application (issued) has been posted in your area. Your apiary is outside the 5.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-05 23:10:18'),
('NT-26100515101888568b', 'BKP-000003', NULL, NULL, 'ALT-000026', NULL, 'Pesticide Alert: Insecticide Application', 'A Insecticide application (issued) has been posted in your area. Your apiary is outside the 5.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-05 23:10:18'),
('NT-261005151111097aea', 'BKP-000003', NULL, NULL, 'ALT-000027', NULL, 'Pesticide Alert: Herbicide Application', 'A Herbicide application (issued) has been posted in your area. Your apiary is outside the 3.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-05 23:11:11'),
('NT-2610051511116c4eab', 'BKP-000002', NULL, NULL, 'ALT-000027', NULL, 'Pesticide Alert: Herbicide Application', 'A Herbicide application (issued) is scheduled within 3.0 km of your apiary (approx. 2.92 km away). Risk level: Low.', 'pesticide_alert', 0, '2026-10-05 23:11:11'),
('NT-261005151111d9f814', 'BKP-000001', NULL, NULL, 'ALT-000027', NULL, 'Pesticide Alert: Herbicide Application', 'A Herbicide application (issued) has been posted in your area. Your apiary is outside the 3.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-05 23:11:11'),
('NT-26100515123740679a', 'BKP-000002', NULL, NULL, 'ALT-000028', NULL, 'Pesticide Alert: Insecticide Application', 'A Insecticide application (issued) has been posted in your area. Your apiary is outside the 5.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-05 23:12:37'),
('NT-2610051512376ad121', 'BKP-000003', NULL, NULL, 'ALT-000028', NULL, 'Pesticide Alert: Insecticide Application', 'A Insecticide application (issued) has been posted in your area. Your apiary is outside the 5.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-05 23:12:37'),
('NT-2610051512379c113d', 'BKP-000001', NULL, NULL, 'ALT-000028', NULL, 'Pesticide Alert: Insecticide Application', 'A Insecticide application (issued) has been posted in your area. Your apiary is outside the 5.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-05 23:12:37'),
('NT-261005151345562e85', NULL, 'CTZ-000003', NULL, NULL, 'RPT-000020', 'New Rescue Offer', 'Kelia Audrey Solis Gamayo offered PHP 150 for report RPT-000020. Tap to view and accept or reject it.', 'rescue_offer', 0, '2026-10-05 23:13:45'),
('NT-2610051514254c478c', NULL, 'CTZ-000003', NULL, NULL, 'RPT-000020', 'New Rescue Offer', 'John Evans Lacuas Gutierrez offered PHP 200 for report RPT-000020. Tap to view and accept or reject it.', 'rescue_offer', 0, '2026-10-05 23:14:25'),
('NT-26100515161076ce59', 'BKP-000002', NULL, NULL, NULL, NULL, 'Queen Replacement Recommended', 'HV-000025: Queen age exceeded 730 days (currently 734 days).', 'queen_recommendation', 0, '2026-10-05 23:16:10'),
('NT-2610051517059e896d', 'BKP-000002', NULL, NULL, NULL, NULL, 'Queen Replacement Recommended', 'HV-000026: Queen age exceeded 730 days (currently 734 days).', 'queen_recommendation', 0, '2026-10-05 23:17:05'),
('NT-26100601470081866c', 'BKP-000002', NULL, NULL, NULL, NULL, 'Queen Replacement Recommended', 'HV-000003: Hive is flagged \'Needs Attention\' and yield dropped from 23.00 kg to 10.00 kg.', 'queen_recommendation', 0, '2026-10-06 09:47:00'),
('NT-261006014710f5c1f2', 'BKP-000002', NULL, NULL, NULL, NULL, 'Queen Replacement Recommended', 'HV-000003: Hive is currently marked \'Weak\' — queen replacement recommended.', 'queen_recommendation', 0, '2026-10-06 09:47:10'),
('NT-2610060150278bc28e', 'BKP-000002', NULL, NULL, 'ALT-000029', NULL, 'Alert Submitted', 'Your pesticide alert \"Fungicide Application\" was sent to the admin for review. It will be shown to other beekeepers once it\'s approved.', 'pesticide_alert', 0, '2026-10-06 09:50:27'),
('NT-261006015027fbb3db', NULL, NULL, 'ADM-000001', 'ALT-000029', NULL, 'Alert Needs Approval', 'Kelia Audrey Solis Gamayo reported Fungicide spraying at 508, Manila. Approve or reject it.', 'alert_review', 0, '2026-10-06 09:50:27')
-- @@END@@

-- Table `otp_codes`
DROP TABLE IF EXISTS `otp_codes`
-- @@END@@
CREATE TABLE `otp_codes` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `email` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `purpose` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'email_verification',
  `attempts` int NOT NULL DEFAULT '0',
  `consumed` tinyint(1) NOT NULL DEFAULT '0',
  `expires_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_otp_email_purpose` (`email`,`purpose`,`consumed`),
  CONSTRAINT `chk_otp_purpose` CHECK ((`purpose` in (_utf8mb3'email_verification',_utf8mb3'password_reset'))),
  CONSTRAINT `chk_otp_role` CHECK ((`role` in (_utf8mb3'citizen',_utf8mb3'beekeeper',_utf8mb3'admin')))
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `otp_codes` (`id`, `email`, `role`, `code_hash`, `purpose`, `attempts`, `consumed`, `expires_at`, `created_at`) VALUES
(1, 'johnevansgutierrez9@gmail.com', 'beekeeper', '448c1e1d5d315fe8bbe4c0f4e5efc27e3d08054ddb85c323818d59df4a9f02c2', 'email_verification', 0, 1, '2026-10-01 09:29:41', '2026-10-01 01:27:54'),
(2, 'sylcrosylpha@gmail.com', 'citizen', 'f2c5085318c5ad6aa3f16c37c16b5b6608e5367da220a78573aaed1c2e2623ff', 'email_verification', 0, 1, '2026-10-01 09:34:33', '2026-10-01 01:34:17'),
(3, 'jmjacolbiapogi@gmail.com', 'citizen', 'fd9e830cead0fe382828c8049ea55623b7c0e2a2ec7c1e674ec9c0bffd86eef1', 'email_verification', 0, 1, '2026-10-01 18:20:51', '2026-10-01 10:20:24'),
(4, 'mickasrn7@gmail.com', 'citizen', 'c07a196f500030302e1d979a8016f79431132fe6323a2fa006998c5beabb6309', 'email_verification', 0, 1, '2026-10-01 18:34:02', '2026-10-01 10:33:22'),
(5, 'kagamayow@gmail.com', 'citizen', '64e172efd702812c3efd4408e68549ec8907e04f7891c42f85e7b63c709ae418', 'email_verification', 0, 1, '2026-10-01 18:34:29', '2026-10-01 10:33:31'),
(6, 'kagamayo@gmail.com', 'beekeeper', '58d56b7de2a593e5aca514b20304f29b48dcb9b03c950d9bbf2efbf32dcfea47', 'email_verification', 0, 1, '2026-10-01 18:41:57', '2026-10-01 10:41:41'),
(7, 'jmjacolbiapogi17@gmail.com', 'citizen', '5f1ba48fe29a413919875148977ec102ce45758524f3b47a53f9ff6cc8563298', 'email_verification', 0, 1, '2026-10-01 21:55:38', '2026-10-01 13:55:08'),
(8, 'janmarcsjacolbia17@gmail.com', 'beekeeper', '879d99ebb58a4fcc90d35130ef42a53bb1c07385b37af9485878085731f3f141', 'email_verification', 0, 1, '2026-10-04 20:18:50', '2026-10-04 12:18:10')
-- @@END@@

-- Table `push_subscriptions`
DROP TABLE IF EXISTS `push_subscriptions`
-- @@END@@
CREATE TABLE `push_subscriptions` (
  `subscription_id` int NOT NULL AUTO_INCREMENT,
  `role` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `endpoint` varchar(700) COLLATE utf8mb4_unicode_ci NOT NULL,
  `endpoint_hash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `p256dh` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `auth` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_agent` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_sent_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`subscription_id`),
  UNIQUE KEY `uq_push_subscriptions_endpoint` (`endpoint_hash`),
  KEY `idx_push_subscriptions_user` (`role`,`user_id`),
  CONSTRAINT `chk_push_subscriptions_role` CHECK ((`role` in (_utf8mb3'admin',_utf8mb3'citizen',_utf8mb3'beekeeper')))
) ENGINE=InnoDB AUTO_INCREMENT=371 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `push_subscriptions` (`subscription_id`, `role`, `user_id`, `endpoint`, `endpoint_hash`, `p256dh`, `auth`, `user_agent`, `created_at`, `last_sent_at`) VALUES
(77, 'citizen', 'CTZ-000005', 'https://fcm.googleapis.com/fcm/send/ebmYvVrOVS4:APA91bG8QAx0mvaDGzBNC92bJ1ENL_9V5SmoOHOCgwlQLgzpZl0xS7Fe1jyff_ZXh6PtFyuaVtLRUf0RU4xjZHgO1c5kxV0G4Gi6BD2ZqZzJsK17yXLezoy3l0DaWvhU-jpVXJufNWdN', 'f0840f613dd9740615b7b24b4079e34faa791385f12cf3db0497c87d3740dd86', 'BFareDFgbS7qBDioNKaVhfvpChUaMOtAD1jMLzjZHitIqXlHK5Q2-6jSGNhrHLB-J9yA2ozTAwH7oQO9luNqSJY', 'UTimFojJ-6Dr7prq9douEQ', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36', '2026-10-01 21:56:08', NULL),
(173, 'beekeeper', 'BKP-000003', 'https://fcm.googleapis.com/fcm/send/d7l1wl55OTo:APA91bFgtS3QLLu3vd8_I7Pm3Vw1yqsl1832KqK83dJO7_YfkwohLYMRgGEVeuhC5rqYwQtxet7W2g4fMzK4N1zMp5_jdYwATClL7jazOL92I6sUTG-B5EIMed1athnp70HbjrWG6a2y', '4ce9a0ee1642c2a048eda1d8e7d0c2c335a5c5370da7a782016dc388b71b3d5c', 'BKBaIDEXmjI1Zkqtw9DG-uXPK0SUMDiYiR19zY3e6fgnJRu70u5MJNtwc4q43U8uBbXxW3V1AHObZYDH2eOKUfk', 'iiVrrZaNqh9dC01SWrufWg', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36', '2026-10-04 21:27:43', '2026-10-05 23:12:38'),
(294, 'admin', 'ADM-000001', 'https://fcm.googleapis.com/fcm/send/eJ4KMV8nzrw:APA91bGdUljkxUOl-ebkHGU0PZhVSUrMw3gCTihgwJKVI5y0xhfUeUA7j2-E6ST1-p5SOvOeXwz9cX42hs6Fljn4kyEiSjgcZAFdKKr6JjaffDE-JOijz_CfQwKs2sQeBD1u4UVicRfi', 'e488408694baa185909875622675aa887a6d422829d644b3b3d15937755b071d', 'BGhfoNHwoO2ubg-Df97mvLG47oWUzhKLV0wA01QIkvcXjLk2c_DoVUFRgY-8KSRkUhbxQYYPIhSfKM4EKh6M_NQ', 'BbaR86f9hX_dkoA5JsrJJQ', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36', '2026-10-05 19:05:15', '2026-10-06 09:50:30'),
(325, 'citizen', 'CTZ-000002', 'https://fcm.googleapis.com/fcm/send/c2XQ69rQRG0:APA91bESncm3Sq3BDxpEb32MiQ6hb9mXXVjR24vVqINJZiqgJzOa1owa3iIcfvS8OBvoSixhMN9bvjxz2Xs3KFI0nDMAFtPHPcEAQWtt32ozD8x5l7cjEt4QcHvusEy61DUQxJq2nJwv', 'f99d92dcaf11fb3292e44e95b5f628d17dc1a8e3195bcf3a2c2dfb0bd5cefd44', 'BCIM401i1xwWa90FtUwnOqicvTUm_M5EzFXR1HLZb334vgfv4_II3czLENzGH1-jhSaC2ed9tGL5nAinQz52ipw', 'Zdj0bwuRpba3XhsOPSUdrQ', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36', '2026-10-06 05:57:29', '2026-10-13 22:45:33'),
(346, 'citizen', 'CTZ-000002', 'https://fcm.googleapis.com/fcm/send/c2BWXvTj6T4:APA91bFeVExtrAVokU4JXt-nbaCIpEjg5wyVKvjW8cIOH8WzU6HPTAqvXe5fYsYd5WVKhrbEfnSEiq5tQNE_Ugg5h55yJUlcpTsa8-5SipaFxH4Zv4E2OiJNbFXsp_323fo7f3kom48k', 'e979455de00940b3d86e6078357b8592557b3c9c19b9a335f7d7feb5d4cefdab', 'BOQ1rH1d2ginh0qrslec75xkk0fY6GCfXjayDpTKc4bnyaUqt1IiqfpcE1DdeUMAwgmKqnVw0Nsk76zayz5rVSk', '0u_2WbyxpuZsZ-Gf2ns8Fg', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36', '2026-10-13 15:32:46', '2026-10-13 22:45:33'),
(350, 'beekeeper', 'BKP-000002', 'https://fcm.googleapis.com/fcm/send/fbBOCODffFI:APA91bE9ttKD-3ubve6zA8vlAWUoOGj1MnVKit2YwVk6o4rX5Vund3GuUNgLiVjFkTs1i6zGjYimMZSuIPJ2B3YH_78HCbpK6q5bY3YfvHxbsDpQEqF19pk9PR1ZecVzAUigcNo-TMpc', '2dda5c351e89b43ddea62c7df87233599b01ffd3c1288904a211d159ea4fd721', 'BK6Oh-woOOU2hjntMcwmUgrO2NXRgi6E9pj0Hw0a3DI9VdQ4SaHRgvysUP6KOz77pJBnd6A7h2j8fgGXDtAF3Cg', 'fQesDRWAmonLZWI5hEoqng', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36', '2026-10-13 15:49:34', '2026-10-13 16:28:50'),
(354, 'beekeeper', 'BKP-000002', 'https://fcm.googleapis.com/fcm/send/c6Udb6Wwhfc:APA91bEWzjY4VgDvwoZJm2OzmqQJEcMUYvYrf1J9Nm-sPERijMoVNUXBjNfA-fhjkXoiyG1KMyc-If5qpj3RZZIKnGlh25Jm9Ea_a8GgDG7SRHscfsirE0to6AkkkoVy-fhWk0GYskDj', 'd1620144368a71ee0bd4f72e6a6fba9e16e187685cd97d66842d3d896bdc4a64', 'BMMIClBNJ2l6DILyzYF99euimPXymSu3MUpOOWrbQV8DH-tbWsXJJR9tqFkXQIOH8oPTTWbMwXzqn8F_DGbkpEk', 'qNkZuX8KoFfhy-4C8N-FTg', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Mobile Safari/537.36', '2026-10-13 16:26:07', '2026-10-13 16:28:50'),
(364, 'beekeeper', 'BKP-000002', 'https://fcm.googleapis.com/fcm/send/c9eYlm8j8Xo:APA91bGVJhtScBBUfURewAQFi6rVzbkC1T9bB7IijmENVXrWkYtHhe-oDtkNRS1NvSSv1b8oubY4-vyRL-oMwJPYNrxabWufY9V62PCukykPLwzv6UhIZZxSsDRpRVQTKEBRMNc-sn04', 'aede42cbef0f4a4493be3b04de7be42a279dd068aac013fa9e56d05506c86578', 'BJTmy5ILehldfGo1i_iMaaZY2yDper_Ktr7tlJAs-Wz6Nz_VcpY5GX504jPbjqAdEvmPz1LYpsflGMo-HZ3vMg0', 'rJOXZ5WR530IvSK-9bSuPg', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Mobile Safari/537.36', '2026-10-13 22:11:04', NULL),
(370, 'beekeeper', 'BKP-000002', 'https://fcm.googleapis.com/fcm/send/dkxWBQiPCyk:APA91bE5-_jLUG5TrJTfUIERkF_JN6XZOE4ZWUS-ManyntiLHI3VXyRRqz5ISXnzAoAB5CNYPC82JmhRdd3s7BL9xgDC4RVAaxynr3b4riqFdvpME4AAk0RncU9yMEyLpFaifP9j26Cw', 'f104ef41ae40adc604bf6e78664d3ed5d3f1d2571dc7d3d73b7a8340b5d7453d', 'BJ6GGk5gJSvv5gFjKbp6FdQyUUYUo_fT96SEaK2N3Kcskx4ZJHqVWsL3Yzxg0ZhFWAjjXrLj6JhgYSetK1Ddb3k', 'mNJOMsjlFsexx39spFcIYA', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36', '2026-10-16 10:27:10', NULL)
-- @@END@@

-- Table `queen_recommendations`
DROP TABLE IF EXISTS `queen_recommendations`
-- @@END@@
CREATE TABLE `queen_recommendations` (
  `recommendation_id` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hive_id` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `beekeeper_id` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `level` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason_code` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `yield_baseline_kg` decimal(10,2) DEFAULT NULL,
  `yield_current_kg` decimal(10,2) DEFAULT NULL,
  `yield_pct` decimal(6,2) DEFAULT NULL,
  `queen_age_days` int DEFAULT NULL,
  `evaluated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `acknowledged_at` timestamp NULL DEFAULT NULL,
  `resolved_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`recommendation_id`),
  KEY `idx_queen_recs_beekeeper` (`beekeeper_id`,`evaluated_at`),
  KEY `idx_queen_recs_hive_open` (`hive_id`,`resolved_at`),
  CONSTRAINT `fk_queen_recs_beekeeper` FOREIGN KEY (`beekeeper_id`) REFERENCES `beekeepers` (`beekeeperID`) ON UPDATE CASCADE,
  CONSTRAINT `fk_queen_recs_hive` FOREIGN KEY (`hive_id`) REFERENCES `hives` (`hive_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_queen_recs_level` CHECK ((`level` in (_utf8mb3'Normal',_utf8mb3'Monitor',_utf8mb3'Replace')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `queen_recommendations` (`recommendation_id`, `hive_id`, `beekeeper_id`, `level`, `reason_code`, `reason`, `yield_baseline_kg`, `yield_current_kg`, `yield_pct`, `queen_age_days`, `evaluated_at`, `acknowledged_at`, `resolved_at`) VALUES
('REC-000001', 'HV-000001', 'BKP-000002', 'Normal', 'NORMAL', 'Hive is performing within expected parameters.', 30.00, NULL, NULL, 152, '2026-10-01 18:45:38', NULL, '2026-10-01 19:00:09'),
('REC-000002', 'HV-000002', 'BKP-000002', 'Normal', 'NORMAL', 'Hive is performing within expected parameters.', 28.00, NULL, NULL, 139, '2026-10-01 18:46:46', NULL, '2026-10-01 19:22:31'),
('REC-000003', 'HV-000003', 'BKP-000002', 'Normal', 'NORMAL', 'Hive is performing within expected parameters.', 22.00, NULL, NULL, 151, '2026-10-01 18:48:02', NULL, '2026-10-06 09:47:00'),
('REC-000004', 'HV-000004', 'BKP-000002', 'Normal', 'NORMAL', 'Hive is performing within expected parameters.', 16.00, NULL, NULL, 232, '2026-10-01 18:49:20', NULL, '2026-10-01 18:50:11'),
('REC-000005', 'HV-000004', 'BKP-000002', 'Replace', 'QUEEN_AGE_EXCEEDED', 'Queen age exceeded 730 days (currently 963 days).', 16.00, NULL, NULL, 963, '2026-10-01 18:50:12', NULL, NULL),
('REC-000006', 'HV-000005', 'BKP-000002', 'Replace', 'QUEEN_AGE_EXCEEDED', 'Queen age exceeded 730 days (currently 963 days).', 15.00, NULL, NULL, 963, '2026-10-01 18:51:16', NULL, NULL),
('REC-000007', 'HV-000006', 'BKP-000002', 'Normal', 'NORMAL', 'Hive is performing within expected parameters.', 28.00, NULL, NULL, 395, '2026-10-01 18:54:17', NULL, NULL),
('REC-000008', 'HV-000007', 'BKP-000002', 'Normal', 'NORMAL', 'Hive is performing within expected parameters.', 26.00, NULL, NULL, 395, '2026-10-01 18:55:43', NULL, '2026-10-01 19:26:06'),
('REC-000009', 'HV-000008', 'BKP-000002', 'Normal', 'NORMAL', 'Hive is performing within expected parameters.', 27.00, NULL, NULL, 395, '2026-10-01 18:56:56', NULL, '2026-10-01 18:57:35'),
('REC-000010', 'HV-000008', 'BKP-000002', 'Replace', 'HEALTH_STATUS_FLAGGED', 'Hive is currently marked \'Weak\' — queen replacement recommended.', 27.00, 15.00, 55.56, 395, '2026-10-01 18:57:35', NULL, '2026-10-01 18:58:05'),
('REC-000011', 'HV-000008', 'BKP-000002', 'Normal', 'NORMAL', 'Hive is performing within expected parameters.', 27.00, 30.00, 111.11, 395, '2026-10-01 18:58:06', NULL, NULL),
('REC-000012', 'HV-000001', 'BKP-000002', 'Replace', 'HEALTH_STATUS_FLAGGED', 'Hive is currently marked \'Needs Attention\' — queen replacement recommended.', 30.00, 18.00, 60.00, 152, '2026-10-01 19:00:09', NULL, '2026-10-01 19:00:37'),
('REC-000013', 'HV-000001', 'BKP-000002', 'Normal', 'NORMAL', 'Hive is performing within expected parameters.', 30.00, 28.00, 93.33, 152, '2026-10-01 19:00:38', NULL, NULL),
('REC-000014', 'HV-000009', 'BKP-000002', 'Normal', 'NORMAL', 'Hive is performing within expected parameters.', 30.00, NULL, NULL, 30, '2026-10-01 19:04:58', NULL, NULL),
('REC-000015', 'HV-000010', 'BKP-000002', 'Normal', 'NORMAL', 'Hive is performing within expected parameters.', 26.00, NULL, NULL, 30, '2026-10-01 19:05:50', NULL, NULL),
('REC-000016', 'HV-000002', 'BKP-000002', 'Replace', 'HEALTH_STATUS_FLAGGED', 'Hive is currently marked \'Weak\' — queen replacement recommended.', 28.00, 13.00, 46.43, 139, '2026-10-01 19:22:31', NULL, '2026-10-01 19:22:47'),
('REC-000017', 'HV-000002', 'BKP-000002', 'Normal', 'NORMAL', 'Hive is performing within expected parameters.', 28.00, 27.00, 96.43, 139, '2026-10-01 19:22:48', NULL, NULL),
('REC-000018', 'HV-000007', 'BKP-000002', 'Replace', 'HEALTH_STATUS_FLAGGED', 'Hive is currently marked \'Weak\' — queen replacement recommended.', 26.00, 15.00, 57.69, 395, '2026-10-01 19:26:07', NULL, '2026-10-01 19:26:49'),
('REC-000019', 'HV-000007', 'BKP-000002', 'Normal', 'NORMAL', 'Hive is performing within expected parameters.', 26.00, 35.00, 134.62, 395, '2026-10-01 19:26:49', NULL, NULL),
('REC-000020', 'HV-000011', 'BKP-000002', 'Normal', 'NORMAL', 'Hive is performing within expected parameters.', 15.00, NULL, NULL, 16, '2026-10-01 19:30:21', NULL, NULL),
('REC-000021', 'HV-000012', 'BKP-000003', 'Normal', 'NORMAL', 'Hive is performing within expected parameters.', 25.00, NULL, NULL, 369, '2026-10-05 22:36:52', NULL, NULL),
('REC-000022', 'HV-000013', 'BKP-000003', 'Normal', 'NORMAL', 'Hive is performing within expected parameters.', NULL, NULL, NULL, 369, '2026-10-05 22:37:59', NULL, NULL),
('REC-000023', 'HV-000014', 'BKP-000003', 'Normal', 'NORMAL', 'Hive is performing within expected parameters.', NULL, NULL, NULL, 369, '2026-10-05 22:40:14', NULL, NULL),
('REC-000024', 'HV-000015', 'BKP-000003', 'Normal', 'NORMAL', 'Hive is performing within expected parameters.', NULL, NULL, NULL, 369, '2026-10-05 22:41:55', NULL, NULL),
('REC-000025', 'HV-000016', 'BKP-000003', 'Normal', 'NORMAL', 'Hive is performing within expected parameters.', NULL, NULL, NULL, 369, '2026-10-05 22:42:24', NULL, NULL),
('REC-000026', 'HV-000017', 'BKP-000003', 'Normal', 'NORMAL', 'Hive is performing within expected parameters.', NULL, NULL, NULL, 369, '2026-10-05 22:43:08', NULL, NULL),
('REC-000027', 'HV-000018', 'BKP-000003', 'Replace', 'QUEEN_AGE_EXCEEDED', 'Queen age exceeded 730 days (currently 764 days).', 30.00, NULL, NULL, 764, '2026-10-05 22:46:19', NULL, NULL),
('REC-000028', 'HV-000019', 'BKP-000003', 'Replace', 'QUEEN_AGE_EXCEEDED', 'Queen age exceeded 730 days (currently 764 days).', 28.00, NULL, NULL, 764, '2026-10-05 22:47:17', NULL, '2026-10-05 22:52:37'),
('REC-000029', 'HV-000020', 'BKP-000003', 'Replace', 'QUEEN_AGE_EXCEEDED', 'Queen age exceeded 730 days (currently 764 days).', 27.00, NULL, NULL, 764, '2026-10-05 22:48:27', NULL, NULL),
('REC-000030', 'HV-000021', 'BKP-000003', 'Replace', 'QUEEN_AGE_EXCEEDED', 'Queen age exceeded 730 days (currently 764 days).', 23.00, NULL, NULL, 764, '2026-10-05 22:49:26', NULL, NULL),
('REC-000031', 'HV-000019', 'BKP-000003', 'Normal', 'NORMAL', 'Hive is performing within expected parameters.', 28.00, 12.00, 42.86, 0, '2026-10-05 22:52:37', NULL, NULL),
('REC-000032', 'HV-000022', 'BKP-000002', 'Normal', 'NORMAL', 'Hive is performing within expected parameters.', 20.00, NULL, NULL, 522, '2026-10-05 23:05:34', NULL, NULL),
('REC-000033', 'HV-000023', 'BKP-000002', 'Normal', 'NORMAL', 'Hive is performing within expected parameters.', 15.00, NULL, NULL, 522, '2026-10-05 23:06:10', NULL, NULL),
('REC-000034', 'HV-000024', 'BKP-000002', 'Replace', 'QUEEN_AGE_EXCEEDED', 'Queen age exceeded 730 days (currently 887 days).', NULL, NULL, NULL, 887, '2026-10-05 23:06:52', NULL, '2026-10-05 23:07:12'),
('REC-000035', 'HV-000024', 'BKP-000002', 'Replace', 'HEALTH_STATUS_FLAGGED', 'Hive is currently marked \'Needs Attention\' — queen replacement recommended.', NULL, NULL, NULL, 522, '2026-10-05 23:07:12', NULL, '2026-10-05 23:07:25'),
('REC-000036', 'HV-000024', 'BKP-000002', 'Normal', 'NORMAL', 'Hive is performing within expected parameters.', NULL, NULL, NULL, 0, '2026-10-05 23:07:25', NULL, NULL),
('REC-000037', 'HV-000025', 'BKP-000002', 'Replace', 'QUEEN_AGE_EXCEEDED', 'Queen age exceeded 730 days (currently 734 days).', 23.00, NULL, NULL, 734, '2026-10-05 23:16:10', NULL, NULL),
('REC-000038', 'HV-000026', 'BKP-000002', 'Replace', 'QUEEN_AGE_EXCEEDED', 'Queen age exceeded 730 days (currently 734 days).', 25.00, NULL, NULL, 734, '2026-10-05 23:17:05', NULL, NULL),
('REC-000039', 'HV-000027', 'BKP-000002', 'Normal', 'NORMAL', 'Hive is performing within expected parameters.', 17.00, NULL, NULL, 370, '2026-10-06 00:50:06', NULL, NULL),
('REC-000040', 'HV-000028', 'BKP-000002', 'Normal', 'NORMAL', 'Hive is performing within expected parameters.', 18.00, NULL, NULL, 370, '2026-10-06 00:50:44', NULL, NULL),
('REC-000041', 'HV-000029', 'BKP-000002', 'Normal', 'NORMAL', 'Hive is performing within expected parameters.', 20.00, NULL, NULL, 370, '2026-10-06 00:51:19', NULL, NULL),
('REC-000042', 'HV-000003', 'BKP-000002', 'Replace', 'DECLINING_AFTER_ATTENTION', 'Hive is flagged \'Needs Attention\' and yield dropped from 23.00 kg to 10.00 kg.', 22.00, 33.00, 150.00, 156, '2026-10-06 09:47:00', NULL, '2026-10-06 09:47:10'),
('REC-000043', 'HV-000003', 'BKP-000002', 'Replace', 'HEALTH_STATUS_FLAGGED', 'Hive is currently marked \'Weak\' — queen replacement recommended.', 22.00, 33.00, 150.00, 156, '2026-10-06 09:47:10', NULL, NULL)
-- @@END@@

-- Table `ratings`
DROP TABLE IF EXISTS `ratings`
-- @@END@@
CREATE TABLE `ratings` (
  `rating_id` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `offer_id` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `citizenID` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `beekeeperID` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rating_value` tinyint NOT NULL,
  `comment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`rating_id`),
  UNIQUE KEY `uq_ratings_offer` (`offer_id`),
  KEY `fk_ratings_citizen` (`citizenID`),
  KEY `fk_ratings_beekeeper` (`beekeeperID`),
  CONSTRAINT `fk_ratings_beekeeper` FOREIGN KEY (`beekeeperID`) REFERENCES `beekeepers` (`beekeeperID`) ON UPDATE CASCADE,
  CONSTRAINT `fk_ratings_citizen` FOREIGN KEY (`citizenID`) REFERENCES `citizens` (`citizenID`) ON UPDATE CASCADE,
  CONSTRAINT `fk_ratings_offer` FOREIGN KEY (`offer_id`) REFERENCES `rescue_offers` (`offer_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_ratings_value` CHECK ((`rating_value` between 1 and 5))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `ratings` (`rating_id`, `offer_id`, `citizenID`, `beekeeperID`, `rating_value`, `comment`, `created_at`) VALUES
('RTG-000001', 'OFR-000004', 'CTZ-000002', 'BKP-000002', 5, NULL, '2026-10-03 18:56:06')
-- @@END@@

-- Table `reports`
DROP TABLE IF EXISTS `reports`
-- @@END@@
CREATE TABLE `reports` (
  `reportID` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `citizenID` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cvscan_id` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `image_url` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ai_species_identified` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sighted_at` datetime DEFAULT NULL,
  `latitude` decimal(10,8) NOT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `bee_danger` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Pending',
  `reported_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` datetime DEFAULT NULL,
  `payment_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Pending',
  `payment_method` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'Cash',
  `cancelled_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`reportID`),
  KEY `fk_reports_citizen` (`citizenID`),
  KEY `fk_reports_cvscan` (`cvscan_id`),
  CONSTRAINT `fk_reports_citizen` FOREIGN KEY (`citizenID`) REFERENCES `citizens` (`citizenID`) ON UPDATE CASCADE,
  CONSTRAINT `fk_reports_cvscan` FOREIGN KEY (`cvscan_id`) REFERENCES `cv_scans` (`cvscan_id`) ON UPDATE CASCADE,
  CONSTRAINT `chk_reports_bee_danger` CHECK ((`bee_danger` in (_utf8mb3'Yes',_utf8mb3'No'))),
  CONSTRAINT `chk_reports_payment_status` CHECK ((`payment_status` in (_utf8mb3'Pending',_utf8mb3'Paid'))),
  CONSTRAINT `chk_reports_status` CHECK ((`status` in (_utf8mb3'Pending',_utf8mb3'In Progress',_utf8mb3'Resolved',_utf8mb3'False Alarm',_utf8mb3'Cancelled')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `reports` (`reportID`, `citizenID`, `cvscan_id`, `image_url`, `ai_species_identified`, `sighted_at`, `latitude`, `longitude`, `bee_danger`, `description`, `status`, `reported_at`, `resolved_at`, `payment_status`, `payment_method`, `cancelled_at`) VALUES
('RPT-000007', 'CTZ-000001', 'CVS-000014', '/uploads/cv-scans/e1822585c3cf45c986d6e84bfb8138c0_1000007766.jpg', 'Apis Mellifera', '2026-10-01 17:44:00', 14.65754070, 121.04526261, 'No', 'Tree', 'In Progress', '2026-10-01 17:44:36', NULL, 'Pending', 'Cash', NULL),
('RPT-000008', 'CTZ-000001', 'CVS-000015', '/uploads/cv-scans/b63bd0292298413f8f5363d546e7a723_1000007767.jpg', 'Apis Mellifera', '2026-10-01 17:56:00', 14.66131096, 121.02984215, 'No', NULL, 'Pending', '2026-10-01 17:57:01', NULL, 'Pending', 'Cash', NULL),
('RPT-000009', 'CTZ-000003', 'CVS-000021', '/uploads/cv-scans/70823e360cde43da9aef5f4e9604e9e8_64335.jpg', 'Apis Mellifera', '2026-10-01 11:30:00', 14.65419694, 121.05155733, 'No', NULL, 'Pending', '2026-10-01 20:36:00', NULL, 'Pending', 'Cash', NULL),
('RPT-000010', 'CTZ-000003', 'CVS-000023', '/uploads/cv-scans/8cbda3fb382a4e72908e55ce50f30c3d_64224.jpg', 'Apis Cerana', '2026-10-01 20:38:00', 14.73743769, 120.97159598, 'No', NULL, 'Pending', '2026-10-01 20:38:39', NULL, 'Pending', 'Cash', NULL),
('RPT-000011', 'CTZ-000003', 'CVS-000024', '/uploads/cv-scans/2d1d9f17ac794bc6be2d0e3e54fcf6ec_64222.jpg', 'Apis Cerana', '2026-09-30 03:25:00', 14.57974758, 121.16600089, 'No', 'Om a mango tree', 'Cancelled', '2026-10-01 21:14:12', NULL, 'Pending', 'Cash', '2026-10-01 21:18:13'),
('RPT-000012', 'CTZ-000003', 'CVS-000025', '/uploads/cv-scans/ed3c770d317f40c993c076e7151085cb_64222.jpg', 'Apis Cerana', '2026-09-30 01:20:00', 14.70727443, 121.09632664, 'No', NULL, 'In Progress', '2026-10-01 21:21:03', NULL, 'Pending', 'Cash', NULL),
('RPT-000013', 'CTZ-000002', 'CVS-000040', '/uploads/cv-scans/aa103bde8e4547b79afd3989b2f59334_035dacd7-abba-4656-b8d5-218eabf32045.jpg', 'Apis Mellifera', '2026-10-01 00:40:00', 14.58719720, 121.17592460, 'Yes', NULL, 'Resolved', '2026-10-02 23:40:38', '2026-10-03 18:55:57', 'Pending', 'Cash', NULL),
('RPT-000014', 'CTZ-000001', 'CVS-000043', '/uploads/cv-scans/3aea7b703d0d43588e11de623976ec08_Screenshot_2026-10-03_051432.png', 'Apis Mellifera', '2026-10-02 09:09:00', 14.65144680, 121.04928780, 'Yes', NULL, 'Pending', '2026-10-03 05:20:55', NULL, 'Pending', 'Cash', NULL),
('RPT-000015', 'CTZ-000001', 'CVS-000044', '/uploads/cv-scans/976718f68ec645fb9c3587ee3bb1763c_Apis-mellifera-yemenitica-the-local-bee.png', 'Apis Mellifera', '2026-10-03 05:19:00', 14.65642253, 121.04607647, 'Yes', 'Aggressive', 'Pending', '2026-10-03 05:21:11', NULL, 'Pending', 'Cash', NULL),
('RPT-000016', 'CTZ-000002', 'CVS-000049', '/uploads/cv-scans/d07a13e42f144100a0ee6d27af5340e2_ezgif-frame-001.jpg', 'Apis Cerana', '2026-10-03 21:02:00', 14.66135000, 121.02993752, 'No', NULL, 'In Progress', '2026-10-03 21:02:07', NULL, 'Pending', 'Cash', NULL),
('RPT-000017', 'CTZ-000002', 'CVS-000050', '/uploads/cv-scans/dd0e05f55b11400b91bf3b54c3442bcf_c9d49d73eb1d4020a0105509613e011a_ezgif-frame-001.jpg', 'Apis Cerana', '2026-10-03 21:14:00', 14.66133444, 121.02984732, 'No', NULL, 'Pending', '2026-10-03 21:15:32', NULL, 'Pending', 'Cash', NULL),
('RPT-000018', 'CTZ-000002', 'CVS-000051', '/uploads/cv-scans/9dd8d01282c749d7a4475fc76c71d051_ed3c770d317f40c993c076e7151085cb_64222.jpg', 'Apis Cerana', '2026-10-03 21:16:00', 14.65711940, 121.02876710, 'No', NULL, 'Pending', '2026-10-03 21:16:27', NULL, 'Pending', 'Cash', NULL),
('RPT-000019', 'CTZ-000002', 'CVS-000052', '/uploads/cv-scans/ae1120dc58a549fea9b27a158b9165d7_0ea75583c4fa4486b7a0603e500e5ca9_inbound8011547062913569486.jpg', 'Apis Cerana', '2026-10-04 16:23:00', 14.66127735, 121.02987333, 'No', 'in apple tree', 'Pending', '2026-10-04 16:24:17', NULL, 'Pending', 'Cash', NULL),
('RPT-000020', 'CTZ-000003', 'CVS-000061', '/uploads/cv-scans/5304ea124c0a42c8942bdcf636873c12_0ea75583c4fa4486b7a0603e500e5ca9_inbound8011547062913569486.jpg', 'Apis Cerana', '2026-10-05 18:26:00', 14.66106976, 121.02958886, 'No', NULL, 'Pending', '2026-10-05 18:27:01', NULL, 'Pending', 'Cash', NULL),
('RPT-000021', 'CTZ-000003', 'CVS-000063', '/uploads/cv-scans/33492763e4294fff98460585d6883b16_b80202373c514b17a6a90d8bdd44e3b4_1000007745.jpg', 'Apis Mellifera', '2026-10-05 19:41:00', 14.66131887, 121.02983681, 'No', 'tree', 'Pending', '2026-10-05 19:41:35', NULL, 'Pending', 'Cash', NULL)
-- @@END@@

-- Table `rescue_offers`
DROP TABLE IF EXISTS `rescue_offers`
-- @@END@@
CREATE TABLE `rescue_offers` (
  `offer_id` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `report_id` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `beekeeperID` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `offered_fee` decimal(10,2) NOT NULL,
  `offer_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Pending',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`offer_id`),
  KEY `fk_rescue_offers_report` (`report_id`),
  KEY `fk_rescue_offers_beekeeper` (`beekeeperID`),
  CONSTRAINT `fk_rescue_offers_beekeeper` FOREIGN KEY (`beekeeperID`) REFERENCES `beekeepers` (`beekeeperID`) ON UPDATE CASCADE,
  CONSTRAINT `fk_rescue_offers_report` FOREIGN KEY (`report_id`) REFERENCES `reports` (`reportID`) ON UPDATE CASCADE,
  CONSTRAINT `chk_rescue_offers_status` CHECK ((`offer_status` in (_utf8mb3'Pending',_utf8mb3'Accepted',_utf8mb3'Rejected',_utf8mb3'Resolved')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `rescue_offers` (`offer_id`, `report_id`, `beekeeperID`, `offered_fee`, `offer_status`, `created_at`, `resolved_at`) VALUES
('OFR-000001', 'RPT-000007', 'BKP-000002', 300.00, 'Accepted', '2026-10-01 19:53:55', NULL),
('OFR-000002', 'RPT-000012', 'BKP-000002', 100.00, 'Accepted', '2026-10-01 21:31:00', NULL),
('OFR-000003', 'RPT-000013', 'BKP-000001', 100.00, 'Rejected', '2026-10-03 05:11:24', NULL),
('OFR-000004', 'RPT-000013', 'BKP-000002', 150.00, 'Resolved', '2026-10-03 18:54:12', '2026-10-03 18:55:57'),
('OFR-000005', 'RPT-000016', 'BKP-000002', 300.00, 'Accepted', '2026-10-03 21:03:38', NULL),
('OFR-000006', 'RPT-000018', 'BKP-000002', 400.00, 'Pending', '2026-10-03 21:17:15', NULL),
('OFR-000007', 'RPT-000019', 'BKP-000001', 400.00, 'Pending', '2026-10-05 01:33:05', NULL),
('OFR-000008', 'RPT-000020', 'BKP-000002', 150.00, 'Pending', '2026-10-05 23:13:45', NULL),
('OFR-000009', 'RPT-000020', 'BKP-000001', 200.00, 'Pending', '2026-10-05 23:14:25', NULL)
-- @@END@@

-- Table `user_id_sequence`
DROP TABLE IF EXISTS `user_id_sequence`
-- @@END@@
CREATE TABLE `user_id_sequence` (
  `role` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `next_value` bigint NOT NULL DEFAULT '1',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`role`),
  CONSTRAINT `chk_user_id_sequence_role` CHECK ((`role` in (_utf8mb3'citizen',_utf8mb3'beekeeper',_utf8mb3'admin',_utf8mb3'hive',_utf8mb3'yield',_utf8mb3'recommendation',_utf8mb3'alert',_utf8mb3'alert_recipient',_utf8mb3'cvscan',_utf8mb3'report',_utf8mb3'offer',_utf8mb3'rating',_utf8mb3'chat_report')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `user_id_sequence` (`role`, `next_value`, `updated_at`) VALUES
('admin', 2, '2026-10-01 09:24:28'),
('alert', 30, '2026-10-06 09:50:27'),
('alert_recipient', 22, '2026-10-05 23:11:11'),
('beekeeper', 4, '2026-10-04 20:18:10'),
('chat_report', 1, '2026-10-01 09:24:28'),
('citizen', 6, '2026-10-01 21:55:05'),
('cvscan', 85, '2026-10-06 09:30:46'),
('hive', 30, '2026-10-06 00:51:19'),
('offer', 10, '2026-10-05 23:14:25'),
('rating', 2, '2026-10-03 18:56:06'),
('recommendation', 44, '2026-10-06 09:47:10'),
('report', 22, '2026-10-05 19:41:35'),
('yield', 57, '2026-10-06 00:52:47')
-- @@END@@

-- Table `user_settings`
DROP TABLE IF EXISTS `user_settings`
-- @@END@@
CREATE TABLE `user_settings` (
  `role` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `setting_key` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `setting_value` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`role`,`user_id`,`setting_key`),
  CONSTRAINT `chk_user_settings_role` CHECK ((`role` in (_utf8mb3'admin',_utf8mb3'citizen',_utf8mb3'beekeeper',_utf8mb3'system')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `user_settings` (`role`, `user_id`, `setting_key`, `setting_value`, `updated_at`) VALUES
('citizen', 'CTZ-000002', 'push_enabled', 'true', '2026-10-04 16:00:58'),
('citizen', 'CTZ-000003', 'push_enabled', 'true', '2026-10-05 12:06:06'),
('system', 'system', 'auto_backup', 'true', '2026-10-04 21:26:50')
-- @@END@@

-- Table `yields`
DROP TABLE IF EXISTS `yields`
-- @@END@@
CREATE TABLE `yields` (
  `yield_id` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hive_id` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `yield_date` date NOT NULL,
  `yield_kg` decimal(10,2) NOT NULL,
  `is_baseline` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `baseline_marker` varchar(15) COLLATE utf8mb4_unicode_ci GENERATED ALWAYS AS ((case when `is_baseline` then `hive_id` else NULL end)) VIRTUAL,
  PRIMARY KEY (`yield_id`),
  UNIQUE KEY `uq_yields_one_baseline_per_hive` (`baseline_marker`),
  KEY `idx_yields_hive_date` (`hive_id`,`yield_date`),
  KEY `idx_yields_baseline` (`hive_id`,`is_baseline`),
  CONSTRAINT `fk_yields_hive` FOREIGN KEY (`hive_id`) REFERENCES `hives` (`hive_id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `yields` (`yield_id`, `hive_id`, `yield_date`, `yield_kg`, `is_baseline`, `created_at`, `baseline_marker`) VALUES
('YLD-000001', 'HV-000001', '2026-12-31', 30.00, 1, '2026-10-01 18:45:34', 'HV-000001'),
('YLD-000002', 'HV-000002', '2026-12-31', 28.00, 1, '2026-10-01 18:46:41', 'HV-000002'),
('YLD-000003', 'HV-000003', '2026-12-31', 22.00, 1, '2026-10-01 18:47:57', 'HV-000003'),
('YLD-000004', 'HV-000004', '2026-12-31', 16.00, 1, '2026-10-01 18:49:15', 'HV-000004'),
('YLD-000005', 'HV-000005', '2026-12-31', 15.00, 1, '2026-10-01 18:51:12', 'HV-000005'),
('YLD-000006', 'HV-000006', '2025-12-31', 28.00, 1, '2026-10-01 18:54:13', 'HV-000006'),
('YLD-000007', 'HV-000007', '2025-12-31', 26.00, 1, '2026-10-01 18:55:38', 'HV-000007'),
('YLD-000008', 'HV-000008', '2025-12-31', 27.00, 1, '2026-10-01 18:56:52', 'HV-000008'),
('YLD-000009', 'HV-000008', '2026-02-14', 15.00, 0, '2026-10-01 18:57:32', NULL),
('YLD-000010', 'HV-000008', '2026-10-01', 15.00, 0, '2026-10-01 18:58:03', NULL),
('YLD-000011', 'HV-000001', '2026-03-18', 18.00, 0, '2026-10-01 19:00:06', NULL),
('YLD-000012', 'HV-000001', '2026-10-01', 10.00, 0, '2026-10-01 19:00:34', NULL),
('YLD-000013', 'HV-000009', '2025-12-31', 30.00, 1, '2026-10-01 19:04:54', 'HV-000009'),
('YLD-000014', 'HV-000010', '2025-12-31', 26.00, 1, '2026-10-01 19:05:45', 'HV-000010'),
('YLD-000015', 'HV-000002', '2026-10-01', 27.00, 0, '2026-10-01 19:22:28', NULL),
('YLD-000016', 'HV-000003', '2026-02-14', 23.00, 0, '2026-10-01 19:23:22', NULL),
('YLD-000017', 'HV-000003', '2026-10-01', 10.00, 0, '2026-10-01 19:23:47', NULL),
('YLD-000018', 'HV-000004', '2026-10-01', 10.00, 0, '2026-10-01 19:24:07', NULL),
('YLD-000019', 'HV-000005', '2026-10-01', 8.00, 0, '2026-10-01 19:24:31', NULL),
('YLD-000020', 'HV-000006', '2026-02-08', 20.00, 0, '2026-10-01 19:25:05', NULL),
('YLD-000021', 'HV-000006', '2026-09-29', 15.00, 0, '2026-10-01 19:25:25', NULL),
('YLD-000022', 'HV-000007', '2026-02-14', 15.00, 0, '2026-10-01 19:26:03', NULL),
('YLD-000023', 'HV-000007', '2026-09-29', 20.00, 0, '2026-10-01 19:26:46', NULL),
('YLD-000024', 'HV-000011', '2026-12-31', 15.00, 1, '2026-10-01 19:30:17', 'HV-000011'),
('YLD-000025', 'HV-000012', '2026-12-31', 25.00, 1, '2026-10-05 22:36:52', 'HV-000012'),
('YLD-000026', 'HV-000017', '2026-10-05', 25.00, 0, '2026-10-05 22:43:32', NULL),
('YLD-000027', 'HV-000016', '2026-10-05', 40.00, 0, '2026-10-05 22:43:43', NULL),
('YLD-000029', 'HV-000012', '2026-10-05', 20.00, 0, '2026-10-05 22:44:13', NULL),
('YLD-000030', 'HV-000015', '2026-10-05', 38.00, 0, '2026-10-05 22:44:41', NULL),
('YLD-000031', 'HV-000014', '2026-10-05', 23.00, 0, '2026-10-05 22:44:51', NULL),
('YLD-000032', 'HV-000013', '2026-10-05', 18.00, 0, '2026-10-05 22:45:00', NULL),
('YLD-000033', 'HV-000018', '2025-12-31', 30.00, 1, '2026-10-05 22:46:19', 'HV-000018'),
('YLD-000034', 'HV-000019', '2026-12-31', 28.00, 1, '2026-10-05 22:47:17', 'HV-000019'),
('YLD-000035', 'HV-000020', '2025-12-31', 27.00, 1, '2026-10-05 22:48:27', 'HV-000020'),
('YLD-000036', 'HV-000021', '2026-12-31', 23.00, 1, '2026-10-05 22:49:26', 'HV-000021'),
('YLD-000037', 'HV-000021', '2026-10-05', 10.00, 0, '2026-10-05 22:51:26', NULL),
('YLD-000038', 'HV-000020', '2026-10-05', 14.00, 0, '2026-10-05 22:51:42', NULL),
('YLD-000039', 'HV-000019', '2026-10-05', 12.00, 0, '2026-10-05 22:52:00', NULL),
('YLD-000040', 'HV-000018', '2026-10-05', 20.00, 0, '2026-10-05 22:52:13', NULL),
('YLD-000041', 'HV-000012', '2026-02-05', 20.00, 0, '2026-10-05 23:02:51', NULL),
('YLD-000042', 'HV-000013', '2026-02-05', 15.00, 0, '2026-10-05 23:03:11', NULL),
('YLD-000043', 'HV-000014', '2026-02-05', 18.00, 0, '2026-10-05 23:03:29', NULL),
('YLD-000044', 'HV-000022', '2025-12-31', 20.00, 1, '2026-10-05 23:05:34', 'HV-000022'),
('YLD-000045', 'HV-000023', '2025-12-31', 15.00, 1, '2026-10-05 23:06:10', 'HV-000023'),
('YLD-000046', 'HV-000024', '2026-04-05', 18.00, 0, '2026-10-05 23:08:11', NULL),
('YLD-000047', 'HV-000023', '2026-04-05', 17.00, 0, '2026-10-05 23:08:31', NULL),
('YLD-000048', 'HV-000022', '2026-04-05', 20.00, 0, '2026-10-05 23:08:48', NULL),
('YLD-000049', 'HV-000025', '2025-12-31', 23.00, 1, '2026-10-05 23:16:10', 'HV-000025'),
('YLD-000050', 'HV-000026', '2025-12-31', 25.00, 1, '2026-10-05 23:17:05', 'HV-000026'),
('YLD-000051', 'HV-000027', '2026-12-31', 17.00, 1, '2026-10-06 00:50:06', 'HV-000027'),
('YLD-000052', 'HV-000028', '2026-12-31', 18.00, 1, '2026-10-06 00:50:44', 'HV-000028'),
('YLD-000053', 'HV-000029', '2026-12-31', 20.00, 1, '2026-10-06 00:51:19', 'HV-000029'),
('YLD-000054', 'HV-000029', '2026-05-05', 20.00, 0, '2026-10-06 00:52:01', NULL),
('YLD-000055', 'HV-000028', '2026-05-05', 17.00, 0, '2026-10-06 00:52:26', NULL),
('YLD-000056', 'HV-000027', '2026-05-05', 16.00, 0, '2026-10-06 00:52:47', NULL)
-- @@END@@

SET FOREIGN_KEY_CHECKS = 1
-- @@END@@
