-- BeeGuard backup (auto) of `beeguard_system`
-- Created 2026-10-04T22:48:30
-- Tables: 22

SET FOREIGN_KEY_CHECKS = 0
-- @@END@@

-- Table `admins`
DROP TABLE IF EXISTS `admins`
-- @@END@@
CREATE TABLE `admins` (
  `adminID` varchar(15) NOT NULL,
  `admin_name` varchar(40) NOT NULL,
  `address` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `contact_no` varchar(10) NOT NULL,
  `email` varchar(50) NOT NULL,
  `status` varchar(10) NOT NULL DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
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
  `recipient_id` varchar(15) NOT NULL,
  `alert_id` varchar(15) NOT NULL,
  `beekeeper_id` varchar(15) NOT NULL,
  `distance_km` decimal(6,2) DEFAULT NULL,
  `risk_level` varchar(10) DEFAULT NULL,
  `notification_id` varchar(25) NOT NULL,
  `notified_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`recipient_id`),
  UNIQUE KEY `uq_alert_recipients_alert_beekeeper` (`alert_id`,`beekeeper_id`),
  KEY `idx_alert_recipients_beekeeper` (`beekeeper_id`,`notified_at`),
  KEY `fk_alert_recipients_notification` (`notification_id`),
  CONSTRAINT `fk_alert_recipients_alert` FOREIGN KEY (`alert_id`) REFERENCES `alerts` (`alert_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_alert_recipients_beekeeper` FOREIGN KEY (`beekeeper_id`) REFERENCES `beekeepers` (`beekeeperID`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_alert_recipients_notification` FOREIGN KEY (`notification_id`) REFERENCES `notifications` (`notification_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_alert_recipients_risk_level` CHECK (`risk_level` is null or `risk_level` in ('Low','Medium','High'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `alert_recipients` (`recipient_id`, `alert_id`, `beekeeper_id`, `distance_km`, `risk_level`, `notification_id`, `notified_at`, `created_at`) VALUES
('ARC-000001', 'ALT-000001', 'BKP-000001', 18.50, 'Low', 'NT-261001113428ae4ac8', NULL, '2026-10-01 19:34:29'),
('ARC-000002', 'ALT-000003', 'BKP-000002', 0.00, 'High', 'NT-261001114003548093', NULL, '2026-10-01 19:40:04'),
('ARC-000003', 'ALT-000005', 'BKP-000002', 2.42, 'Low', 'NT-26100111425227f7a5', NULL, '2026-10-01 19:42:53'),
('ARC-000004', 'ALT-000006', 'BKP-000002', 4.63, 'Low', 'NT-2610011144140cbcfa', NULL, '2026-10-01 19:44:15'),
('ARC-000005', 'ALT-000008', 'BKP-000001', 2.45, 'Medium', 'NT-2610011158126f6995', NULL, '2026-10-01 19:58:12'),
('ARC-000006', 'ALT-000009', 'BKP-000001', 2.18, 'Medium', 'NT-2610011200140d5db1', NULL, '2026-10-01 20:00:15'),
('ARC-000007', 'ALT-000010', 'BKP-000001', 2.15, 'Low', 'NT-261001120200e512a0', NULL, '2026-10-01 20:02:01'),
('ARC-000008', 'ALT-000011', 'BKP-000001', 2.15, 'Medium', 'NT-26100112031264e5d2', NULL, '2026-10-01 20:03:13')
-- @@END@@

-- Table `alerts`
DROP TABLE IF EXISTS `alerts`
-- @@END@@
CREATE TABLE `alerts` (
  `alert_id` varchar(15) NOT NULL,
  `adminID` varchar(15) DEFAULT NULL,
  `beekeeperID` varchar(15) DEFAULT NULL,
  `reported_by_beekeeper_id` varchar(15) DEFAULT NULL,
  `source` varchar(20) NOT NULL DEFAULT 'admin',
  `title` varchar(100) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `pesticide_type` varchar(50) DEFAULT NULL,
  `application_method` varchar(30) DEFAULT NULL,
  `affected_area` varchar(100) DEFAULT NULL,
  `latitude` decimal(10,8) NOT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `scheduled_date` datetime NOT NULL,
  `expiration_date` datetime DEFAULT NULL,
  `danger_radius_km` decimal(5,2) NOT NULL,
  `risk_level` varchar(10) NOT NULL,
  `approval_status` varchar(10) NOT NULL DEFAULT 'Approved',
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `reviewed_by` varchar(15) DEFAULT NULL,
  `rejection_reason` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`alert_id`),
  KEY `fk_alerts_admin` (`adminID`),
  KEY `fk_alerts_beekeeper` (`beekeeperID`),
  KEY `fk_alerts_reported_by_beekeeper` (`reported_by_beekeeper_id`),
  KEY `idx_alerts_approval` (`approval_status`,`scheduled_date`),
  CONSTRAINT `fk_alerts_admin` FOREIGN KEY (`adminID`) REFERENCES `admins` (`adminID`) ON UPDATE CASCADE,
  CONSTRAINT `fk_alerts_beekeeper` FOREIGN KEY (`beekeeperID`) REFERENCES `beekeepers` (`beekeeperID`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_alerts_reported_by_beekeeper` FOREIGN KEY (`reported_by_beekeeper_id`) REFERENCES `beekeepers` (`beekeeperID`) ON UPDATE CASCADE,
  CONSTRAINT `chk_alerts_application_method` CHECK (`application_method` is null or `application_method` in ('Aerial Spray','Ground Spray','Fogging','Dusting','Soil Application')),
  CONSTRAINT `chk_alerts_approval_status` CHECK (`approval_status` in ('Pending','Approved','Rejected')),
  CONSTRAINT `chk_alerts_risk_level` CHECK (`risk_level` in ('Low','Medium','High')),
  CONSTRAINT `chk_alerts_source` CHECK (`source` in ('admin','beekeeper'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `alerts` (`alert_id`, `adminID`, `beekeeperID`, `reported_by_beekeeper_id`, `source`, `title`, `description`, `pesticide_type`, `application_method`, `affected_area`, `latitude`, `longitude`, `scheduled_date`, `expiration_date`, `danger_radius_km`, `risk_level`, `approval_status`, `reviewed_at`, `reviewed_by`, `rejection_reason`, `created_at`, `updated_at`) VALUES
('ALT-000001', NULL, NULL, 'BKP-000001', 'beekeeper', 'Fungicide Application', NULL, 'Fungicide', NULL, 'Vasra, Quezon City', 14.65677006, 121.04729732, '2026-10-08 02:00:00', '2026-10-22 02:00:00', 3.00, 'Low', 'Approved', '2026-10-01 19:34:27', 'ADM-000001', NULL, '2026-10-01 10:06:46', '2026-10-01 19:34:30'),
('ALT-000002', 'ADM-000001', NULL, NULL, 'admin', 'Fungicide Application', NULL, 'Fungicide', NULL, 'Batasan Hills, Quezon City', 14.68418814, 121.10871138, '2026-10-08 00:00:00', '2026-10-22 00:00:00', 3.00, 'Low', 'Approved', NULL, NULL, NULL, '2026-10-01 19:39:25', '2026-10-01 19:39:26'),
('ALT-000003', 'ADM-000001', NULL, NULL, 'admin', 'Fungicide Application', NULL, 'Fungicide', NULL, 'Santa Monica, Quezon City', 14.71017400, 121.04807300, '2026-10-08 00:00:00', '2026-10-22 00:00:00', 3.00, 'High', 'Approved', NULL, NULL, NULL, '2026-10-01 19:40:02', '2026-10-01 19:40:04'),
('ALT-000004', 'ADM-000001', NULL, NULL, 'admin', 'Herbicide Application', NULL, 'Herbicide', NULL, 'Greater Lagro, Quezon City', 14.72463795, 121.07257739, '2026-11-09 01:00:00', '2026-11-23 01:00:00', 3.00, 'Low', 'Approved', NULL, NULL, NULL, '2026-10-01 19:41:39', '2026-10-01 19:41:40'),
('ALT-000005', 'ADM-000001', NULL, NULL, 'admin', 'Fungicide Application', NULL, 'Fungicide', NULL, 'Greater Lagro, Quezon City', 14.71522924, 121.06998071, '2026-12-15 02:45:00', '2026-12-29 02:45:00', 3.00, 'Low', 'Approved', NULL, NULL, NULL, '2026-10-01 19:42:52', '2026-10-01 19:42:54'),
('ALT-000006', 'ADM-000001', NULL, NULL, 'admin', 'Insecticide Application', NULL, 'Insecticide', NULL, 'Barangay 177, Caloocan', 14.75186266, 121.05211079, '2026-12-20 01:00:00', '2027-01-03 01:00:00', 5.00, 'Low', 'Approved', NULL, NULL, NULL, '2026-10-01 19:44:13', '2026-10-01 19:44:15'),
('ALT-000007', 'ADM-000001', NULL, NULL, 'admin', 'Fungicide Application', NULL, 'Fungicide', NULL, 'Zone 17, Pasay', 14.53550710, 121.01148976, '2026-10-12 11:50:00', '2026-10-26 11:50:00', 3.00, 'Low', 'Approved', NULL, NULL, NULL, '2026-10-01 19:50:49', '2026-10-01 19:50:50'),
('ALT-000008', 'ADM-000001', NULL, NULL, 'admin', 'Insecticide Application', NULL, 'Insecticide', NULL, 'Sun Valley, Parañaque', 14.48866950, 121.04116524, '2026-10-02 00:00:00', '2026-10-16 00:00:00', 5.00, 'Medium', 'Approved', NULL, NULL, NULL, '2026-10-01 19:58:11', NULL),
('ALT-000009', 'ADM-000001', NULL, NULL, 'admin', 'Insecticide Application', NULL, 'Insecticide', NULL, 'Merville, Parañaque', 14.50117585, 121.03653513, '2026-10-03 00:00:00', '2026-10-17 00:00:00', 5.00, 'Medium', 'Approved', NULL, NULL, NULL, '2026-10-01 20:00:14', NULL),
('ALT-000010', 'ADM-000001', NULL, NULL, 'admin', 'Pesticide Application', NULL, NULL, NULL, 'Merville, Parañaque', 14.50021662, 121.03666553, '2026-10-03 00:00:00', '2026-10-17 00:00:00', 3.00, 'Low', 'Approved', NULL, NULL, NULL, '2026-10-01 20:02:00', '2026-10-01 20:02:02'),
('ALT-000011', 'ADM-000001', NULL, NULL, 'admin', 'Insecticide Application', NULL, 'Insecticide', NULL, 'Merville, Parañaque', 14.50021662, 121.03666553, '2026-10-03 00:00:00', '2026-10-17 00:00:00', 5.00, 'Medium', 'Approved', NULL, NULL, NULL, '2026-10-01 20:03:12', NULL)
-- @@END@@

-- Table `beekeepers`
DROP TABLE IF EXISTS `beekeepers`
-- @@END@@
CREATE TABLE `beekeepers` (
  `beekeeperID` varchar(15) NOT NULL,
  `name` varchar(40) NOT NULL,
  `citizenship` varchar(20) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `username` varchar(30) NOT NULL,
  `password` varchar(255) NOT NULL,
  `contact_no` varchar(10) NOT NULL,
  `email` varchar(50) NOT NULL,
  `email_verified` tinyint(1) NOT NULL DEFAULT 0,
  `profile_photo` varchar(255) DEFAULT NULL,
  `farm_photo` varchar(255) DEFAULT NULL,
  `farm_name` varchar(20) DEFAULT NULL,
  `apiary_type` varchar(20) NOT NULL,
  `status` varchar(10) NOT NULL DEFAULT 'Active',
  `verification_document_type` varchar(60) DEFAULT NULL,
  `verification_document_url` varchar(255) DEFAULT NULL,
  `verification_status` varchar(15) NOT NULL DEFAULT 'Unverified',
  `verification_submitted_at` timestamp NULL DEFAULT NULL,
  `verification_reviewed_at` timestamp NULL DEFAULT NULL,
  `verification_reviewed_by` varchar(15) DEFAULT NULL,
  `verification_rejection_reason` varchar(255) DEFAULT NULL,
  `terms_accepted` tinyint(1) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`beekeeperID`),
  UNIQUE KEY `uq_beekeepers_email` (`email`),
  UNIQUE KEY `uq_beekeepers_username` (`username`),
  UNIQUE KEY `uq_beekeepers_contact_no` (`contact_no`),
  KEY `idx_beekeepers_verification` (`verification_status`,`verification_submitted_at`),
  CONSTRAINT `chk_beekeepers_apiary_type` CHECK (`apiary_type` in ('Commercial Farm','Backyard','Rooftop','Wild/Forest')),
  CONSTRAINT `chk_beekeepers_status` CHECK (`status` in ('Active','Inactive')),
  CONSTRAINT `chk_beekeepers_verification_status` CHECK (`verification_status` in ('Unverified','Pending','Verified','Rejected'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `beekeepers` (`beekeeperID`, `name`, `citizenship`, `address`, `latitude`, `longitude`, `username`, `password`, `contact_no`, `email`, `email_verified`, `profile_photo`, `farm_photo`, `farm_name`, `apiary_type`, `status`, `verification_document_type`, `verification_document_url`, `verification_status`, `verification_submitted_at`, `verification_reviewed_at`, `verification_reviewed_by`, `verification_rejection_reason`, `terms_accepted`, `created_at`, `updated_at`, `deleted_at`) VALUES
('BKP-000001', 'John Evans Lacuas Gutierrez', 'Filipino', 'Lot 1 Blk 5, De Leon St., Moonwalk, City of ParaÃ±aque, National Capital Region (NCR)', 14.49191787, 121.01864865, 'sylp', '$2b$12$AAx4G45t0RR4YNsWPEcpGuGNQimr2mLwEJO9ciPCQ2XIe1cy8wq/u', '9296630831', 'johnevansgutierrez9@gmail.com', 1, NULL, 'bf_4adca5700e9848c2bbf0c64cd15007ff.jpg', 'Happy Bee Farm', 'Commercial Farm', 'Active', 'Valid Government ID', 'BKP-000001_194e4d2503d8443cab013f8243cde3e0.jpg', 'Verified', '2026-10-01 09:30:57', '2026-10-01 09:31:57', 'ADM-000001', NULL, 1, '2026-10-01 09:27:54', '2026-10-03 12:07:13', NULL),
('BKP-000002', 'Kelia Audrey Solis Gamayo', 'Filipino', '13 Sitio Gamayo Banaba Street Palmera Homes Phase 3, Santa Monica, Quezon City, National Capital Region (NCR)', 14.71015612, 121.04810616, 'kelibee', '$2b$12$F/T9egma1wSyeaMffDidEucwesBigwhxI3eKa0p/AIyjINxkEaiq6', '9122540303', 'kagamayo@gmail.com', 1, NULL, NULL, 'KeliVille', 'Backyard', 'Active', 'Valid Government ID', 'BKP-000002_6da5238054c544cab218acb8f7451702.jpeg', 'Verified', '2026-10-01 19:15:29', '2026-10-01 19:36:23', 'ADM-000001', NULL, 1, '2026-10-01 18:41:38', '2026-10-03 11:11:53', NULL),
('BKP-000003', 'Jan Marc Soberano Jacolbia', 'Filipino', 'Misamis St, Santo Cristo, Quezon City, National Capital Region (NCR)', 14.66127040, 121.02981050, 'zhaix', '$2b$12$Vgolt0cxaaTmlAMXPKHOk.eYE24X7kzW6vqO6gLCT2Ixmz9CUNscC', '9265424419', 'janmarcsjacolbia17@gmail.com', 1, 'bp_2ca03bd459b247538a424ca55a420e98.jpg', 'bf_7cfa4c83af6c4716aa2501da256a0781.jpg', 'Zhaix the bee', 'Rooftop', 'Active', 'QCitizen ID', 'BKP-000003_e36a5f7bd94447d9bec8a2def5a20308.jpg', 'Pending', '2026-10-04 20:24:21', NULL, NULL, NULL, 1, '2026-10-04 20:18:10', '2026-10-04 20:24:21', NULL)
-- @@END@@

-- Table `chat_reports`
DROP TABLE IF EXISTS `chat_reports`
-- @@END@@
CREATE TABLE `chat_reports` (
  `chat_report_id` varchar(15) NOT NULL,
  `chat_id` int(11) NOT NULL,
  `reporter_role` varchar(10) NOT NULL,
  `reporter_id` varchar(15) NOT NULL,
  `category` varchar(50) NOT NULL,
  `details` varchar(255) DEFAULT NULL,
  `status` varchar(15) NOT NULL DEFAULT 'Pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `resolved_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`chat_report_id`),
  KEY `fk_chat_reports_chat` (`chat_id`),
  CONSTRAINT `fk_chat_reports_chat` FOREIGN KEY (`chat_id`) REFERENCES `chats` (`chat_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_chat_reports_role` CHECK (`reporter_role` in ('Citizen','Beekeeper')),
  CONSTRAINT `chk_chat_reports_status` CHECK (`status` in ('Pending','Reviewed','Dismissed'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@

-- Table `chats`
DROP TABLE IF EXISTS `chats`
-- @@END@@
CREATE TABLE `chats` (
  `chat_id` int(11) NOT NULL AUTO_INCREMENT,
  `citizenID` varchar(15) DEFAULT NULL,
  `beekeeperID` varchar(15) DEFAULT NULL,
  `citizen_marked_unread` tinyint(1) NOT NULL DEFAULT 0,
  `beekeeper_marked_unread` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`chat_id`),
  KEY `fk_chats_citizen` (`citizenID`),
  KEY `fk_chats_beekeeper` (`beekeeperID`),
  CONSTRAINT `fk_chats_beekeeper` FOREIGN KEY (`beekeeperID`) REFERENCES `beekeepers` (`beekeeperID`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_chats_citizen` FOREIGN KEY (`citizenID`) REFERENCES `citizens` (`citizenID`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `chats` (`chat_id`, `citizenID`, `beekeeperID`, `citizen_marked_unread`, `beekeeper_marked_unread`, `created_at`) VALUES
(2, 'CTZ-000001', 'BKP-000002', 0, 0, '2026-10-01 19:54:04'),
(3, 'CTZ-000002', 'BKP-000002', 0, 0, '2026-10-01 20:14:58')
-- @@END@@

-- Table `citizens`
DROP TABLE IF EXISTS `citizens`
-- @@END@@
CREATE TABLE `citizens` (
  `citizenID` varchar(15) NOT NULL,
  `name` varchar(40) NOT NULL,
  `citizenship` varchar(20) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `username` varchar(30) NOT NULL,
  `password` varchar(255) NOT NULL,
  `contact_no` varchar(10) NOT NULL,
  `email` varchar(50) NOT NULL,
  `email_verified` tinyint(1) NOT NULL DEFAULT 0,
  `profile_photo` varchar(255) DEFAULT NULL,
  `status` varchar(10) NOT NULL DEFAULT 'Active',
  `terms_accepted` tinyint(1) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
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
  `cvscan_id` varchar(15) NOT NULL,
  `citizenID` varchar(15) DEFAULT NULL,
  `image_url` varchar(255) NOT NULL,
  `identified_species` varchar(50) DEFAULT NULL,
  `confidence_score` decimal(5,2) DEFAULT NULL,
  `scanned_at` timestamp NOT NULL DEFAULT current_timestamp(),
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
('CVS-000052', 'CTZ-000002', '/uploads/cv-scans/ae1120dc58a549fea9b27a158b9165d7_0ea75583c4fa4486b7a0603e500e5ca9_inbound8011547062913569486.jpg', 'Apis Cerana', 70.12, '2026-10-04 16:22:49')
-- @@END@@

-- Table `follows`
DROP TABLE IF EXISTS `follows`
-- @@END@@
CREATE TABLE `follows` (
  `citizenID` varchar(15) NOT NULL,
  `beekeeperID` varchar(15) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
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
  `hive_id` varchar(15) NOT NULL,
  `beekeeper_id` varchar(15) NOT NULL,
  `hive_name` varchar(15) NOT NULL,
  `bee_species` varchar(50) NOT NULL,
  `location` varchar(100) DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `date_established` date NOT NULL,
  `queen_installed_date` date DEFAULT NULL,
  `historical_yield_kg` decimal(10,2) DEFAULT NULL,
  `historical_yield_year` int(11) DEFAULT NULL,
  `health_status` varchar(20) NOT NULL,
  `hive_state` varchar(20) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`hive_id`),
  KEY `idx_hives_beekeeper` (`beekeeper_id`),
  CONSTRAINT `fk_hives_beekeeper` FOREIGN KEY (`beekeeper_id`) REFERENCES `beekeepers` (`beekeeperID`) ON UPDATE CASCADE,
  CONSTRAINT `chk_hives_health_status` CHECK (`health_status` in ('Healthy','Needs Attention','Weak','Diseased'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `hives` (`hive_id`, `beekeeper_id`, `hive_name`, `bee_species`, `location`, `latitude`, `longitude`, `date_established`, `queen_installed_date`, `historical_yield_kg`, `historical_yield_year`, `health_status`, `hive_state`, `created_at`, `updated_at`) VALUES
('HV-000001', 'BKP-000002', 'AM1', 'Apis mellifera', 'Santa Monica, Quezon City', 14.7107874, 121.0481842, '2024-01-02', '2026-05-02', 30.00, 2026, 'Healthy', 'Active', '2026-10-01 18:45:33', '2026-10-01 19:00:36'),
('HV-000002', 'BKP-000002', 'AM2', 'Apis mellifera', 'Santa Monica, Quezon City', 14.7101419, 121.0481339, '2026-01-02', '2026-05-15', 28.00, 2026, 'Healthy', 'Active', '2026-10-01 18:46:40', '2026-10-01 19:22:46'),
('HV-000003', 'BKP-000002', 'AM3', 'Apis mellifera', 'Santa Monica, Quezon City', 14.7109482, 121.0486929, '2026-01-02', '2026-05-03', 22.00, 2026, 'Healthy', 'Active', '2026-10-01 18:47:56', NULL),
('HV-000004', 'BKP-000002', 'AM4', 'Apis mellifera', 'Payatas, Quezon City', 14.7071755, 121.0964527, '2024-02-11', '2024-02-11', 16.00, 2026, 'Needs Attention', 'Active', '2026-10-01 18:49:14', '2026-10-01 19:24:09'),
('HV-000005', 'BKP-000002', 'AM5', 'Apis mellifera', 'Payatas, Quezon City', 14.7069635, 121.0964574, '2024-02-11', '2024-02-11', 15.00, 2026, 'Weak', 'Active', '2026-10-01 18:51:11', '2026-10-01 19:24:32'),
('HV-000006', 'BKP-000002', 'AM6', 'Apis mellifera', 'Vasra, Quezon City', 14.6562857, 121.0468967, '2025-09-01', '2025-09-01', 28.00, 2025, 'Healthy', 'Active', '2026-10-01 18:54:12', NULL),
('HV-000007', 'BKP-000002', 'AM7', 'Apis mellifera', 'Vasra, Quezon City', 14.6561514, 121.0467173, '2025-09-01', '2025-09-01', 26.00, 2025, 'Healthy', 'Active', '2026-10-01 18:55:37', '2026-10-01 19:26:47'),
('HV-000008', 'BKP-000002', 'AM8', 'Apis mellifera', 'Vasra, Quezon City', 14.6560684, 121.0471033, '2025-09-01', '2025-09-01', 27.00, 2025, 'Healthy', 'Active', '2026-10-01 18:56:51', '2026-10-01 18:58:04'),
('HV-000009', 'BKP-000002', 'AM9', 'Apis mellifera', 'Vasra, Quezon City', 14.6558181, 121.0468906, '2026-09-01', '2026-09-01', 30.00, 2025, 'Healthy', 'Active', '2026-10-01 19:04:53', NULL),
('HV-000010', 'BKP-000002', 'AM10', 'Apis mellifera', 'Vasra, Quezon City', 14.6557834, 121.0473780, '2026-09-01', '2026-09-01', 26.00, 2025, 'Healthy', 'Active', '2026-10-01 19:05:44', NULL),
('HV-000011', 'BKP-000002', 'AM11', 'Apis mellifera', 'Santa Monica, Quezon City', 14.7102698, 121.0481951, '2025-09-15', '2025-09-15', 15.00, 2026, 'Healthy', 'Active', '2026-10-01 19:30:16', '2026-10-01 19:30:54')
-- @@END@@

-- Table `hives_maintenance`
DROP TABLE IF EXISTS `hives_maintenance`
-- @@END@@
CREATE TABLE `hives_maintenance` (
  `maintenance_id` varchar(15) NOT NULL,
  `hive_id` varchar(15) NOT NULL,
  `activity_type` varchar(30) NOT NULL,
  `remarks` text DEFAULT NULL,
  `activity_date` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`maintenance_id`),
  KEY `fk_hives_maintenance_hive` (`hive_id`),
  CONSTRAINT `fk_hives_maintenance_hive` FOREIGN KEY (`hive_id`) REFERENCES `hives` (`hive_id`) ON UPDATE CASCADE,
  CONSTRAINT `chk_hives_maintenance_activity_type` CHECK (`activity_type` in ('Feeding','Mite Treatment','Inspection'))
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
('MT-261001112646', 'HV-000007', 'Inspection', 'Harvest Inspection: Normal / Healthy', '2026-09-29', '2026-10-01 19:26:46')
-- @@END@@

-- Table `messages`
DROP TABLE IF EXISTS `messages`
-- @@END@@
CREATE TABLE `messages` (
  `message_id` int(11) NOT NULL AUTO_INCREMENT,
  `chat_id` int(11) NOT NULL,
  `sender_role` varchar(10) NOT NULL,
  `message_type` varchar(10) NOT NULL DEFAULT 'text',
  `message_content` text NOT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `live_until` timestamp NULL DEFAULT NULL,
  `location_updated_at` timestamp NULL DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `sent_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`message_id`),
  KEY `fk_messages_chat` (`chat_id`),
  CONSTRAINT `fk_messages_chat` FOREIGN KEY (`chat_id`) REFERENCES `chats` (`chat_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_messages_image_url` CHECK (`message_type` <> 'image' or `image_url` is not null),
  CONSTRAINT `chk_messages_location_coords` CHECK (`message_type` <> 'location' or `latitude` is not null and `longitude` is not null),
  CONSTRAINT `chk_messages_sender_role` CHECK (`sender_role` in ('Beekeeper','Citizen')),
  CONSTRAINT `chk_messages_type` CHECK (`message_type` in ('text','location','image'))
) ENGINE=InnoDB AUTO_INCREMENT=69 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
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
(68, 3, 'Citizen', 'text', 'HAHAHAHHAHAHA', NULL, NULL, NULL, NULL, NULL, 1, '2026-10-04 19:16:14')
-- @@END@@

-- Table `notifications`
DROP TABLE IF EXISTS `notifications`
-- @@END@@
CREATE TABLE `notifications` (
  `notification_id` varchar(25) NOT NULL,
  `beekeeperID` varchar(15) DEFAULT NULL,
  `citizenID` varchar(15) DEFAULT NULL,
  `adminID` varchar(15) DEFAULT NULL,
  `alert_id` varchar(15) DEFAULT NULL,
  `reportID` varchar(15) DEFAULT NULL,
  `title` varchar(100) NOT NULL,
  `message` text NOT NULL,
  `notification_type` varchar(20) NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
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
('NT-26100102064603967f', 'BKP-000001', NULL, NULL, 'ALT-000001', NULL, 'Alert Submitted', 'Your pesticide alert \"Fungicide Application\" was sent to the admin for review. It will be shown to other beekeepers once it\'s approved.', 'pesticide_alert', 1, '2026-10-01 10:06:46'),
('NT-261001020648580624', NULL, NULL, 'ADM-000001', 'ALT-000001', NULL, 'Alert Needs Approval', 'John Evans Lacuas Gutierrez reported Fungicide spraying at Vasra, Quezon City. Approve or reject it.', 'alert_review', 0, '2026-10-01 10:06:48'),
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
('NT-261001113428ae4ac8', 'BKP-000001', NULL, NULL, 'ALT-000001', NULL, 'Alert Approved', 'Your pesticide alert \"Fungicide Application\" was approved by the admin and sent to 1 beekeeper(s). None of them are inside the 3.0 km danger radius. Your own apiary is approx. 18.50 km from the site (risk level: Low).', 'pesticide_alert', 0, '2026-10-01 19:34:29'),
('NT-261001113428ff408b', 'BKP-000002', NULL, NULL, 'ALT-000001', NULL, 'Pesticide Alert: Fungicide Application', 'A Fungicide application (reported by a fellow beekeeper (John Evans Lacuas Gutierrez)) has been posted in your area. Your apiary is outside the 3.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-01 19:34:28'),
('NT-26100111362445a1f5', 'BKP-000002', NULL, NULL, NULL, NULL, 'Account Verified', 'Your beekeeper account has been verified. You can now view bee reports and send rescue offers.', 'verification', 0, '2026-10-01 19:36:24'),
('NT-26100111392622b831', 'BKP-000002', NULL, NULL, 'ALT-000002', NULL, 'Pesticide Alert: Fungicide Application', 'A Fungicide application (issued) has been posted in your area. Your apiary is outside the 3.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-01 19:39:26'),
('NT-261001113926c69c92', 'BKP-000001', NULL, NULL, 'ALT-000002', NULL, 'Pesticide Alert: Fungicide Application', 'A Fungicide application (issued) has been posted in your area. Your apiary is outside the 3.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-01 19:39:26'),
('NT-261001114003548093', 'BKP-000002', NULL, NULL, 'ALT-000003', NULL, 'Pesticide Alert: Fungicide Application', 'A Fungicide application (issued) is scheduled within 3.0 km of your apiary (approx. 0.00 km away). Risk level: High.', 'pesticide_alert', 0, '2026-10-01 19:40:03'),
('NT-2610011140044e02c2', 'BKP-000001', NULL, NULL, 'ALT-000003', NULL, 'Pesticide Alert: Fungicide Application', 'A Fungicide application (issued) has been posted in your area. Your apiary is outside the 3.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-01 19:40:04'),
('NT-26100111413910294e', 'BKP-000002', NULL, NULL, 'ALT-000004', NULL, 'Pesticide Alert: Herbicide Application', 'A Herbicide application (issued) has been posted in your area. Your apiary is outside the 3.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-01 19:41:39'),
('NT-261001114139b90101', 'BKP-000001', NULL, NULL, 'ALT-000004', NULL, 'Pesticide Alert: Herbicide Application', 'A Herbicide application (issued) has been posted in your area. Your apiary is outside the 3.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-01 19:41:39'),
('NT-26100111425227f7a5', 'BKP-000002', NULL, NULL, 'ALT-000005', NULL, 'Pesticide Alert: Fungicide Application', 'A Fungicide application (issued) is scheduled within 3.0 km of your apiary (approx. 2.42 km away). Risk level: Low.', 'pesticide_alert', 0, '2026-10-01 19:42:52'),
('NT-261001114253a9067b', 'BKP-000001', NULL, NULL, 'ALT-000005', NULL, 'Pesticide Alert: Fungicide Application', 'A Fungicide application (issued) has been posted in your area. Your apiary is outside the 3.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-01 19:42:53'),
('NT-2610011144140cbcfa', 'BKP-000002', NULL, NULL, 'ALT-000006', NULL, 'Pesticide Alert: Insecticide Application', 'A Insecticide application (issued) is scheduled within 5.0 km of your apiary (approx. 4.63 km away). Risk level: Low.', 'pesticide_alert', 0, '2026-10-01 19:44:14'),
('NT-261001114415754fb9', 'BKP-000001', NULL, NULL, 'ALT-000006', NULL, 'Pesticide Alert: Insecticide Application', 'A Insecticide application (issued) has been posted in your area. Your apiary is outside the 5.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-01 19:44:15'),
('NT-261001115049001629', 'BKP-000001', NULL, NULL, 'ALT-000007', NULL, 'Pesticide Alert: Fungicide Application', 'A Fungicide application (issued) has been posted in your area. Your apiary is outside the 3.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-01 19:50:49'),
('NT-261001115049c0f233', 'BKP-000002', NULL, NULL, 'ALT-000007', NULL, 'Pesticide Alert: Fungicide Application', 'A Fungicide application (issued) has been posted in your area. Your apiary is outside the 3.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-01 19:50:50'),
('NT-2610011153576967f2', NULL, 'CTZ-000001', NULL, NULL, 'RPT-000007', 'New Rescue Offer', 'Kelia Audrey Solis Gamayo offered PHP 300 for report RPT-000007. Tap to view and accept or reject it.', 'rescue_offer', 0, '2026-10-01 19:53:57'),
('NT-2610011158126f6995', 'BKP-000001', NULL, NULL, 'ALT-000008', NULL, 'Pesticide Alert: Insecticide Application', 'A Insecticide application (issued) is scheduled within 5.0 km of your apiary (approx. 2.45 km away). Risk level: Medium.', 'pesticide_alert', 0, '2026-10-01 19:58:12'),
('NT-26100111581358eb21', 'BKP-000002', NULL, NULL, 'ALT-000008', NULL, 'Pesticide Alert: Insecticide Application', 'A Insecticide application (issued) has been posted in your area. Your apiary is outside the 5.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-01 19:58:13'),
('NT-2610011200140d5db1', 'BKP-000001', NULL, NULL, 'ALT-000009', NULL, 'Pesticide Alert: Insecticide Application', 'A Insecticide application (issued) is scheduled within 5.0 km of your apiary (approx. 2.18 km away). Risk level: Medium.', 'pesticide_alert', 0, '2026-10-01 20:00:14'),
('NT-2610011200156956ca', 'BKP-000002', NULL, NULL, 'ALT-000009', NULL, 'Pesticide Alert: Insecticide Application', 'A Insecticide application (issued) has been posted in your area. Your apiary is outside the 5.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-01 20:00:15'),
('NT-261001120200e512a0', 'BKP-000001', NULL, NULL, 'ALT-000010', NULL, 'Pesticide Alert: Pesticide Application', 'A pesticide application (issued) is scheduled within 3.0 km of your apiary (approx. 2.15 km away). Risk level: Low.', 'pesticide_alert', 0, '2026-10-01 20:02:00'),
('NT-2610011202013749fe', 'BKP-000002', NULL, NULL, 'ALT-000010', NULL, 'Pesticide Alert: Pesticide Application', 'A pesticide application (issued) has been posted in your area. Your apiary is outside the 3.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-01 20:02:01'),
('NT-26100112031264e5d2', 'BKP-000001', NULL, NULL, 'ALT-000011', NULL, 'Pesticide Alert: Insecticide Application', 'A Insecticide application (issued) is scheduled within 5.0 km of your apiary (approx. 2.15 km away). Risk level: Medium.', 'pesticide_alert', 0, '2026-10-01 20:03:12'),
('NT-261001120313e94e4c', 'BKP-000002', NULL, NULL, 'ALT-000011', NULL, 'Pesticide Alert: Insecticide Application', 'A Insecticide application (issued) has been posted in your area. Your apiary is outside the 5.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-10-01 20:03:13'),
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
('NT-261001133102bbb764', NULL, 'CTZ-000003', NULL, NULL, 'RPT-000012', 'New Rescue Offer', 'Kelia Audrey Solis Gamayo offered PHP 100 for report RPT-000012. Tap to view and accept or reject it.', 'rescue_offer', 0, '2026-10-01 21:31:02'),
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
('NT-2610041224219c9de6', NULL, NULL, 'ADM-000001', NULL, NULL, 'Verification Request', 'Jan Marc Soberano Jacolbia (Zhaix the bee) uploaded a QCitizen ID for verification.', 'verify_request', 0, '2026-10-04 20:24:21')
-- @@END@@

-- Table `otp_codes`
DROP TABLE IF EXISTS `otp_codes`
-- @@END@@
CREATE TABLE `otp_codes` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `email` varchar(50) NOT NULL,
  `role` varchar(20) NOT NULL,
  `code_hash` varchar(255) NOT NULL,
  `purpose` varchar(30) NOT NULL DEFAULT 'email_verification',
  `attempts` int(11) NOT NULL DEFAULT 0,
  `consumed` tinyint(1) NOT NULL DEFAULT 0,
  `expires_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_otp_email_purpose` (`email`,`purpose`,`consumed`),
  CONSTRAINT `chk_otp_purpose` CHECK (`purpose` in ('email_verification','password_reset')),
  CONSTRAINT `chk_otp_role` CHECK (`role` in ('citizen','beekeeper','admin'))
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
  `subscription_id` int(11) NOT NULL AUTO_INCREMENT,
  `role` varchar(10) NOT NULL,
  `user_id` varchar(15) NOT NULL,
  `endpoint` varchar(700) NOT NULL,
  `endpoint_hash` char(64) NOT NULL,
  `p256dh` varchar(200) NOT NULL,
  `auth` varchar(100) NOT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_sent_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`subscription_id`),
  UNIQUE KEY `uq_push_subscriptions_endpoint` (`endpoint_hash`),
  KEY `idx_push_subscriptions_user` (`role`,`user_id`),
  CONSTRAINT `chk_push_subscriptions_role` CHECK (`role` in ('admin','citizen','beekeeper'))
) ENGINE=InnoDB AUTO_INCREMENT=174 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `push_subscriptions` (`subscription_id`, `role`, `user_id`, `endpoint`, `endpoint_hash`, `p256dh`, `auth`, `user_agent`, `created_at`, `last_sent_at`) VALUES
(77, 'citizen', 'CTZ-000005', 'https://fcm.googleapis.com/fcm/send/ebmYvVrOVS4:APA91bG8QAx0mvaDGzBNC92bJ1ENL_9V5SmoOHOCgwlQLgzpZl0xS7Fe1jyff_ZXh6PtFyuaVtLRUf0RU4xjZHgO1c5kxV0G4Gi6BD2ZqZzJsK17yXLezoy3l0DaWvhU-jpVXJufNWdN', 'f0840f613dd9740615b7b24b4079e34faa791385f12cf3db0497c87d3740dd86', 'BFareDFgbS7qBDioNKaVhfvpChUaMOtAD1jMLzjZHitIqXlHK5Q2-6jSGNhrHLB-J9yA2ozTAwH7oQO9luNqSJY', 'UTimFojJ-6Dr7prq9douEQ', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36', '2026-10-01 21:56:08', NULL),
(88, 'citizen', 'CTZ-000001', 'https://fcm.googleapis.com/fcm/send/cHx_8NapExc:APA91bEqR0VZTaViw8LXTPMo2j1T3Yi3WMmjhUPn-2UeBK3z7kbvNPX5VgsT7gxf1KAz1imrBNsZXl-re6ttl4z29raiBmzwjW9pcnnx93HTBerw-yOKr-zNBlLo1fj0rFi7DPMYZA2W', 'e650b037eece374f0169b2f593d1ce873d9be8a4d6f6831b76d5261236ca78e8', 'BM4gAJENuY_IpeHq_fk21mczREpV5N7lYhcpK3_WsyKjVSVZ6lXbuiEgoIZK5LkK7xCKpNTJIdnAGKBSbr5OGXw', 'Su0fk2uoQh_xRDI5yP8giA', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36', '2026-10-03 05:16:57', NULL),
(163, 'beekeeper', 'BKP-000003', 'https://fcm.googleapis.com/fcm/send/dFYsbGGUans:APA91bFpHDPzbTpP3-wbjGzUjQhuWoQ2zgJMv4eU3aAySv60ksLKTCNozVt8Z0QRNfnwwU9xE00pIYU4BLxtZd-ToYGzIzC8VQinyhgpPfwdqkqlXBBEhX5E6KjIwqRjZX064USbZGii', '4eb6e0e345a2a7c65b86772c517bdb884193b252dae1c052ab1d1bb6bdd1874f', 'BAar-4nV5Nv164eDPLEF7HpYt3q81PhUgvQCY4cw3-DVdacJtQF3F6bDcJ2aNtHA48or5KT-7-3pnDp2levYkb0', '4DJYoXXihrXYOhE1Hoh3Pw', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36', '2026-10-04 20:50:38', NULL),
(173, 'beekeeper', 'BKP-000003', 'https://fcm.googleapis.com/fcm/send/d7l1wl55OTo:APA91bFgtS3QLLu3vd8_I7Pm3Vw1yqsl1832KqK83dJO7_YfkwohLYMRgGEVeuhC5rqYwQtxet7W2g4fMzK4N1zMp5_jdYwATClL7jazOL92I6sUTG-B5EIMed1athnp70HbjrWG6a2y', '4ce9a0ee1642c2a048eda1d8e7d0c2c335a5c5370da7a782016dc388b71b3d5c', 'BKBaIDEXmjI1Zkqtw9DG-uXPK0SUMDiYiR19zY3e6fgnJRu70u5MJNtwc4q43U8uBbXxW3V1AHObZYDH2eOKUfk', 'iiVrrZaNqh9dC01SWrufWg', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36', '2026-10-04 21:27:43', NULL)
-- @@END@@

-- Table `queen_recommendations`
DROP TABLE IF EXISTS `queen_recommendations`
-- @@END@@
CREATE TABLE `queen_recommendations` (
  `recommendation_id` varchar(15) NOT NULL,
  `hive_id` varchar(15) NOT NULL,
  `beekeeper_id` varchar(15) NOT NULL,
  `level` varchar(20) NOT NULL,
  `reason_code` varchar(40) NOT NULL,
  `reason` varchar(255) NOT NULL,
  `yield_baseline_kg` decimal(10,2) DEFAULT NULL,
  `yield_current_kg` decimal(10,2) DEFAULT NULL,
  `yield_pct` decimal(6,2) DEFAULT NULL,
  `queen_age_days` int(11) DEFAULT NULL,
  `evaluated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `acknowledged_at` timestamp NULL DEFAULT NULL,
  `resolved_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`recommendation_id`),
  KEY `idx_queen_recs_beekeeper` (`beekeeper_id`,`evaluated_at`),
  KEY `idx_queen_recs_hive_open` (`hive_id`,`resolved_at`),
  CONSTRAINT `fk_queen_recs_beekeeper` FOREIGN KEY (`beekeeper_id`) REFERENCES `beekeepers` (`beekeeperID`) ON UPDATE CASCADE,
  CONSTRAINT `fk_queen_recs_hive` FOREIGN KEY (`hive_id`) REFERENCES `hives` (`hive_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_queen_recs_level` CHECK (`level` in ('Normal','Monitor','Replace'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `queen_recommendations` (`recommendation_id`, `hive_id`, `beekeeper_id`, `level`, `reason_code`, `reason`, `yield_baseline_kg`, `yield_current_kg`, `yield_pct`, `queen_age_days`, `evaluated_at`, `acknowledged_at`, `resolved_at`) VALUES
('REC-000001', 'HV-000001', 'BKP-000002', 'Normal', 'NORMAL', 'Hive is performing within expected parameters.', 30.00, NULL, NULL, 152, '2026-10-01 18:45:38', NULL, '2026-10-01 19:00:09'),
('REC-000002', 'HV-000002', 'BKP-000002', 'Normal', 'NORMAL', 'Hive is performing within expected parameters.', 28.00, NULL, NULL, 139, '2026-10-01 18:46:46', NULL, '2026-10-01 19:22:31'),
('REC-000003', 'HV-000003', 'BKP-000002', 'Normal', 'NORMAL', 'Hive is performing within expected parameters.', 22.00, NULL, NULL, 151, '2026-10-01 18:48:02', NULL, NULL),
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
('REC-000020', 'HV-000011', 'BKP-000002', 'Normal', 'NORMAL', 'Hive is performing within expected parameters.', 15.00, NULL, NULL, 16, '2026-10-01 19:30:21', NULL, NULL)
-- @@END@@

-- Table `ratings`
DROP TABLE IF EXISTS `ratings`
-- @@END@@
CREATE TABLE `ratings` (
  `rating_id` varchar(15) NOT NULL,
  `offer_id` varchar(15) NOT NULL,
  `citizenID` varchar(15) NOT NULL,
  `beekeeperID` varchar(15) NOT NULL,
  `rating_value` tinyint(4) NOT NULL,
  `comment` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`rating_id`),
  UNIQUE KEY `uq_ratings_offer` (`offer_id`),
  KEY `fk_ratings_citizen` (`citizenID`),
  KEY `fk_ratings_beekeeper` (`beekeeperID`),
  CONSTRAINT `fk_ratings_beekeeper` FOREIGN KEY (`beekeeperID`) REFERENCES `beekeepers` (`beekeeperID`) ON UPDATE CASCADE,
  CONSTRAINT `fk_ratings_citizen` FOREIGN KEY (`citizenID`) REFERENCES `citizens` (`citizenID`) ON UPDATE CASCADE,
  CONSTRAINT `fk_ratings_offer` FOREIGN KEY (`offer_id`) REFERENCES `rescue_offers` (`offer_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_ratings_value` CHECK (`rating_value` between 1 and 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `ratings` (`rating_id`, `offer_id`, `citizenID`, `beekeeperID`, `rating_value`, `comment`, `created_at`) VALUES
('RTG-000001', 'OFR-000004', 'CTZ-000002', 'BKP-000002', 5, NULL, '2026-10-03 18:56:06')
-- @@END@@

-- Table `reports`
DROP TABLE IF EXISTS `reports`
-- @@END@@
CREATE TABLE `reports` (
  `reportID` varchar(15) NOT NULL,
  `citizenID` varchar(15) NOT NULL,
  `cvscan_id` varchar(15) NOT NULL,
  `image_url` varchar(255) NOT NULL,
  `ai_species_identified` varchar(50) NOT NULL,
  `sighted_at` datetime DEFAULT NULL,
  `latitude` decimal(10,8) NOT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `bee_danger` varchar(5) NOT NULL,
  `description` varchar(50) DEFAULT NULL,
  `status` varchar(15) NOT NULL DEFAULT 'Pending',
  `reported_at` datetime NOT NULL DEFAULT current_timestamp(),
  `resolved_at` datetime DEFAULT NULL,
  `payment_status` varchar(20) NOT NULL DEFAULT 'Pending',
  `payment_method` varchar(20) DEFAULT 'Cash',
  `cancelled_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`reportID`),
  KEY `fk_reports_citizen` (`citizenID`),
  KEY `fk_reports_cvscan` (`cvscan_id`),
  CONSTRAINT `fk_reports_citizen` FOREIGN KEY (`citizenID`) REFERENCES `citizens` (`citizenID`) ON UPDATE CASCADE,
  CONSTRAINT `fk_reports_cvscan` FOREIGN KEY (`cvscan_id`) REFERENCES `cv_scans` (`cvscan_id`) ON UPDATE CASCADE,
  CONSTRAINT `chk_reports_bee_danger` CHECK (`bee_danger` in ('Yes','No')),
  CONSTRAINT `chk_reports_payment_status` CHECK (`payment_status` in ('Pending','Paid')),
  CONSTRAINT `chk_reports_status` CHECK (`status` in ('Pending','In Progress','Resolved','False Alarm','Cancelled'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `reports` (`reportID`, `citizenID`, `cvscan_id`, `image_url`, `ai_species_identified`, `sighted_at`, `latitude`, `longitude`, `bee_danger`, `description`, `status`, `reported_at`, `resolved_at`, `payment_status`, `payment_method`, `cancelled_at`) VALUES
('RPT-000007', 'CTZ-000001', 'CVS-000014', '/uploads/cv-scans/e1822585c3cf45c986d6e84bfb8138c0_1000007766.jpg', 'Apis Mellifera', '2026-10-01 17:44:00', 14.65754070, 121.04526261, 'No', 'Tree', 'In Progress', '2026-10-01 17:44:36', NULL, 'Pending', 'Cash', NULL),
('RPT-000008', 'CTZ-000001', 'CVS-000015', '/uploads/cv-scans/b63bd0292298413f8f5363d546e7a723_1000007767.jpg', 'Apis Mellifera', '2026-10-01 17:56:00', 14.66131096, 121.02984215, 'No', NULL, 'Pending', '2026-10-01 17:57:01', NULL, 'Pending', 'Cash', NULL),
('RPT-000009', 'CTZ-000003', 'CVS-000021', '/uploads/cv-scans/70823e360cde43da9aef5f4e9604e9e8_64335.jpg', 'Apis Mellifera', '2026-10-01 11:30:00', 14.65419694, 121.05155733, 'No', NULL, 'Pending', '2026-10-01 20:36:00', NULL, 'Pending', 'Cash', NULL),
('RPT-000010', 'CTZ-000003', 'CVS-000023', '/uploads/cv-scans/8cbda3fb382a4e72908e55ce50f30c3d_64224.jpg', 'Apis Cerana', '2026-10-01 20:38:00', 14.73743769, 120.97159598, 'No', NULL, 'Pending', '2026-10-01 20:38:39', NULL, 'Pending', 'Cash', NULL),
('RPT-000011', 'CTZ-000003', 'CVS-000024', '/uploads/cv-scans/2d1d9f17ac794bc6be2d0e3e54fcf6ec_64222.jpg', 'Apis Cerana', '2026-09-30 03:25:00', 14.57974758, 121.16600089, 'No', 'Om a mango tree', 'Cancelled', '2026-10-01 21:14:12', NULL, 'Pending', 'Cash', '2026-10-01 21:18:13'),
('RPT-000012', 'CTZ-000003', 'CVS-000025', '/uploads/cv-scans/ed3c770d317f40c993c076e7151085cb_64222.jpg', 'Apis Cerana', '2026-09-30 01:20:00', 14.70727443, 121.09632664, 'No', NULL, 'Pending', '2026-10-01 21:21:03', NULL, 'Pending', 'Cash', NULL),
('RPT-000013', 'CTZ-000002', 'CVS-000040', '/uploads/cv-scans/aa103bde8e4547b79afd3989b2f59334_035dacd7-abba-4656-b8d5-218eabf32045.jpg', 'Apis Mellifera', '2026-10-01 00:40:00', 14.58719720, 121.17592460, 'Yes', NULL, 'Resolved', '2026-10-02 23:40:38', '2026-10-03 18:55:57', 'Pending', 'Cash', NULL),
('RPT-000014', 'CTZ-000001', 'CVS-000043', '/uploads/cv-scans/3aea7b703d0d43588e11de623976ec08_Screenshot_2026-10-03_051432.png', 'Apis Mellifera', '2026-10-02 09:09:00', 14.65144680, 121.04928780, 'Yes', NULL, 'Pending', '2026-10-03 05:20:55', NULL, 'Pending', 'Cash', NULL),
('RPT-000015', 'CTZ-000001', 'CVS-000044', '/uploads/cv-scans/976718f68ec645fb9c3587ee3bb1763c_Apis-mellifera-yemenitica-the-local-bee.png', 'Apis Mellifera', '2026-10-03 05:19:00', 14.65642253, 121.04607647, 'Yes', 'Aggressive', 'Pending', '2026-10-03 05:21:11', NULL, 'Pending', 'Cash', NULL),
('RPT-000016', 'CTZ-000002', 'CVS-000049', '/uploads/cv-scans/d07a13e42f144100a0ee6d27af5340e2_ezgif-frame-001.jpg', 'Apis Cerana', '2026-10-03 21:02:00', 14.66135000, 121.02993752, 'No', NULL, 'In Progress', '2026-10-03 21:02:07', NULL, 'Pending', 'Cash', NULL),
('RPT-000017', 'CTZ-000002', 'CVS-000050', '/uploads/cv-scans/dd0e05f55b11400b91bf3b54c3442bcf_c9d49d73eb1d4020a0105509613e011a_ezgif-frame-001.jpg', 'Apis Cerana', '2026-10-03 21:14:00', 14.66133444, 121.02984732, 'No', NULL, 'Pending', '2026-10-03 21:15:32', NULL, 'Pending', 'Cash', NULL),
('RPT-000018', 'CTZ-000002', 'CVS-000051', '/uploads/cv-scans/9dd8d01282c749d7a4475fc76c71d051_ed3c770d317f40c993c076e7151085cb_64222.jpg', 'Apis Cerana', '2026-10-03 21:16:00', 14.65711940, 121.02876710, 'No', NULL, 'Pending', '2026-10-03 21:16:27', NULL, 'Pending', 'Cash', NULL),
('RPT-000019', 'CTZ-000002', 'CVS-000052', '/uploads/cv-scans/ae1120dc58a549fea9b27a158b9165d7_0ea75583c4fa4486b7a0603e500e5ca9_inbound8011547062913569486.jpg', 'Apis Cerana', '2026-10-04 16:23:00', 14.66127735, 121.02987333, 'No', 'in apple tree', 'Pending', '2026-10-04 16:24:17', NULL, 'Pending', 'Cash', NULL)
-- @@END@@

-- Table `rescue_offers`
DROP TABLE IF EXISTS `rescue_offers`
-- @@END@@
CREATE TABLE `rescue_offers` (
  `offer_id` varchar(15) NOT NULL,
  `report_id` varchar(15) NOT NULL,
  `beekeeperID` varchar(15) NOT NULL,
  `offered_fee` decimal(10,2) NOT NULL,
  `offer_status` varchar(20) NOT NULL DEFAULT 'Pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `resolved_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`offer_id`),
  KEY `fk_rescue_offers_report` (`report_id`),
  KEY `fk_rescue_offers_beekeeper` (`beekeeperID`),
  CONSTRAINT `fk_rescue_offers_beekeeper` FOREIGN KEY (`beekeeperID`) REFERENCES `beekeepers` (`beekeeperID`) ON UPDATE CASCADE,
  CONSTRAINT `fk_rescue_offers_report` FOREIGN KEY (`report_id`) REFERENCES `reports` (`reportID`) ON UPDATE CASCADE,
  CONSTRAINT `chk_rescue_offers_status` CHECK (`offer_status` in ('Pending','Accepted','Rejected','Resolved'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `rescue_offers` (`offer_id`, `report_id`, `beekeeperID`, `offered_fee`, `offer_status`, `created_at`, `resolved_at`) VALUES
('OFR-000001', 'RPT-000007', 'BKP-000002', 300.00, 'Accepted', '2026-10-01 19:53:55', NULL),
('OFR-000002', 'RPT-000012', 'BKP-000002', 100.00, 'Pending', '2026-10-01 21:31:00', NULL),
('OFR-000003', 'RPT-000013', 'BKP-000001', 100.00, 'Rejected', '2026-10-03 05:11:24', NULL),
('OFR-000004', 'RPT-000013', 'BKP-000002', 150.00, 'Resolved', '2026-10-03 18:54:12', '2026-10-03 18:55:57'),
('OFR-000005', 'RPT-000016', 'BKP-000002', 300.00, 'Accepted', '2026-10-03 21:03:38', NULL),
('OFR-000006', 'RPT-000018', 'BKP-000002', 400.00, 'Pending', '2026-10-03 21:17:15', NULL)
-- @@END@@

-- Table `user_id_sequence`
DROP TABLE IF EXISTS `user_id_sequence`
-- @@END@@
CREATE TABLE `user_id_sequence` (
  `role` varchar(15) NOT NULL,
  `next_value` bigint(20) NOT NULL DEFAULT 1,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`role`),
  CONSTRAINT `chk_user_id_sequence_role` CHECK (`role` in ('citizen','beekeeper','admin','hive','yield','recommendation','alert','alert_recipient','cvscan','report','offer','rating','chat_report'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `user_id_sequence` (`role`, `next_value`, `updated_at`) VALUES
('admin', 2, '2026-10-01 09:24:28'),
('alert', 12, '2026-10-01 20:03:12'),
('alert_recipient', 9, '2026-10-01 20:03:13'),
('beekeeper', 4, '2026-10-04 20:18:10'),
('chat_report', 1, '2026-10-01 09:24:28'),
('citizen', 6, '2026-10-01 21:55:05'),
('cvscan', 53, '2026-10-04 16:22:49'),
('hive', 12, '2026-10-01 19:30:16'),
('offer', 7, '2026-10-03 21:17:15'),
('rating', 2, '2026-10-03 18:56:06'),
('recommendation', 21, '2026-10-01 19:30:21'),
('report', 20, '2026-10-04 16:24:17'),
('yield', 25, '2026-10-01 19:30:16')
-- @@END@@

-- Table `user_settings`
DROP TABLE IF EXISTS `user_settings`
-- @@END@@
CREATE TABLE `user_settings` (
  `role` varchar(10) NOT NULL,
  `user_id` varchar(15) NOT NULL,
  `setting_key` varchar(40) NOT NULL,
  `setting_value` varchar(20) NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`role`,`user_id`,`setting_key`),
  CONSTRAINT `chk_user_settings_role` CHECK (`role` in ('admin','citizen','beekeeper','system'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `user_settings` (`role`, `user_id`, `setting_key`, `setting_value`, `updated_at`) VALUES
('citizen', 'CTZ-000002', 'push_enabled', 'true', '2026-10-04 16:00:58'),
('system', 'system', 'auto_backup', 'true', '2026-10-04 21:26:50')
-- @@END@@

-- Table `yields`
DROP TABLE IF EXISTS `yields`
-- @@END@@
CREATE TABLE `yields` (
  `yield_id` varchar(15) NOT NULL,
  `hive_id` varchar(15) NOT NULL,
  `yield_date` date NOT NULL,
  `yield_kg` decimal(10,2) NOT NULL,
  `is_baseline` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `baseline_marker` varchar(15) GENERATED ALWAYS AS (case when `is_baseline` then `hive_id` else NULL end) VIRTUAL,
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
('YLD-000024', 'HV-000011', '2026-12-31', 15.00, 1, '2026-10-01 19:30:17', 'HV-000011')
-- @@END@@

SET FOREIGN_KEY_CHECKS = 1
-- @@END@@
