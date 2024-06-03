# Andromda Live Season

## Description

Update the Live Financial Period, Live NuOrder Period, and Live Production Period flags in Andromeda for any styles based on their values in StyleProfile or StyleProfileDetail.

## Schedule

Every 30 minutes at :00 and :30.

## How To Run

There are two ways to run the program.

1. In the task scheduler in NGCANC, right click 'Andromeda Live Season' and click "Run".
2. Navigate to the location of the program in a terminal window and type "npm run start".

## How It Works

### Steps

1. Run andromedaAuthorization to connect to the Andromeda API.
2. Find any styles where the Live Season needs to be updated by running [Andromeda-DownFrom].[dbo].[PopulateLiveSeason]. This will populate a table in [Andromeda-DownFrom].[dbo].[LiveSeason] with all styles that need the live season to be updated.
3. Pass the data generated from job above into the updateLivePeriod function. This function takes the data of styles that need to be changed, the field number that needs to be changed in Andromeda, and the field in SQL Server that contains the correct season. It then loops through all the data and updates the field in Andromeda with the data from the SQL Server field.
4. Repeat the above process with [Andromeda-UpTo].[dbo].[PopulateLiveFinancialPeriod] job and [Andromeda-UpTo].[dbo].[LiveFinancialPeriod] table.
5. Repeat the above process with [Andromeda-UpTo].[dbo].[PopulateLiveNuOrderPeriod] job and [Andromeda-UpTo].[dbo].[LiveNuOrderPeriod] table.
6. Repeat the above process with [Andromeda-UpTo].[dbo].[PopulateLiveProductionPeriod] job and [Andromeda-UpTo].[dbo].[LiveProductionPeriod] table.
7. For any live production periods or live financial periods that have changed, force down any cost sheets for those new periods that are ERPReady. This allows them to be re-processed by our ERP.
8. Send an email with any errors that occurred during the process.
