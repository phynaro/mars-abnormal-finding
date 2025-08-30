-- Add AvatarUrl column to Users table to store profile image path
ALTER TABLE Users
ADD AvatarUrl NVARCHAR(500) NULL;

