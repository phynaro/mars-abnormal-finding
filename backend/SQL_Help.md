##to get WO count for each WO types##
Qurey:
SELECT 
    t.WOTypeCode,
    COUNT(*) AS TotalWO,
    COUNT(CASE WHEN w.WRNO <> 0 THEN 1 END) AS WO_With_WRNO
FROM dbo.WO w
INNER JOIN dbo.WOType t 
    ON w.WOTypeNO = t.WOTypeNO
GROUP BY t.WOTypeCode
ORDER BY TotalWO DESC;

Result:
WOTypeCode|TotalWO|WO_With_WRNO|
----------+-------+------------+
PML1      |  77127|        1607|
PML2      |  42149|        3589|
BM        |  26316|       26268|
DEL-SM    |  11604|       11580|
CM        |  11473|       11127|
PML3      |  10410|         944|
CAL       |   7859|         724|
CI        |   4267|        4254|
OTH       |    885|         870|
SAFETY    |    660|         651|
OFFICE    |    277|         270|
IM        |    167|         166|
WB        |     71|          71|
PCM       |     41|          41|

######################################################################
Query: 
SELECT 
    t.WOTypeCode,
    COUNT(*) AS TotalWO,
    COUNT(CASE WHEN w.WRNO <> 0 THEN 1 END) AS WO_With_WRNO,
    COUNT(CASE WHEN w.WRNO = 0 THEN 1 END) AS Direct_WO
FROM dbo.WO w
INNER JOIN dbo.WOType t 
    ON w.WOTypeNO = t.WOTypeNO
GROUP BY t.WOTypeCode
ORDER BY TotalWO DESC;

Result:
WOTypeCode|TotalWO|WO_With_WRNO|Direct_WO|
----------+-------+------------+---------+
PML1      |  77127|        1607|    75520|
PML2      |  42149|        3589|    38560|
BM        |  26316|       26268|       48|
DEL-SM    |  11604|       11580|       24|
CM        |  11473|       11127|      346|
PML3      |  10410|         944|     9466|
CAL       |   7859|         724|     7135|
CI        |   4267|        4254|       13|
OTH       |    885|         870|       15|
SAFETY    |    660|         651|        9|
OFFICE    |    277|         270|        7|
IM        |    167|         166|        1|
WB        |     71|          71|        0|
PCM       |     41|          41|        0|

######################################################################
Query: 
SELECT 
    t.WOTypeCode,
    s.WOStatusNO,
    s.WOStatusName,
    COUNT(*) AS WO_Count
FROM dbo.WO w
INNER JOIN dbo.WOType t 
    ON w.WOTypeNO = t.WOTypeNO
INNER JOIN dbo.WOStatus s
    ON w.WOStatusNO = s.WOStatusNO
GROUP BY t.WOTypeCode, s.WOStatusNO, s.WOStatusName
ORDER BY t.WOTypeCode, WO_Count DESC;

Result:
WOTypeCode|WOStatusNO|WOStatusName    |WO_Count|
----------+----------+----------------+--------+
BM        |         9|History         |   24210|
BM        |         4|In Progress     |     861|
BM        |         5|Finish          |     805|
BM        |         8|Cancelld        |     298|
BM        |         1|Work Initiated  |     134|
BM        |         3|Scheduled       |       8|
CAL       |         9|History         |    7236|
CAL       |         3|Scheduled       |     228|
CAL       |         8|Cancelld        |     203|
CAL       |         4|In Progress     |     151|
CAL       |         1|Work Initiated  |      25|
CAL       |         5|Finish          |      16|
CI        |         9|History         |    3779|
CI        |         4|In Progress     |     198|
CI        |         8|Cancelld        |     145|
CI        |         1|Work Initiated  |      87|
CI        |         3|Scheduled       |      38|
CI        |         5|Finish          |      20|
CM        |         9|History         |    9546|
CM        |         8|Cancelld        |    1317|
CM        |         4|In Progress     |     379|
CM        |         1|Work Initiated  |     173|
CM        |         3|Scheduled       |      32|
CM        |         5|Finish          |      25|
CM        |         2|Planed Resource |       1|
DEL-SM    |         9|History         |   10430|
DEL-SM    |         8|Cancelld        |    1174|
IM        |         9|History         |     122|
IM        |         8|Cancelld        |      45|
OFFICE    |         9|History         |     200|
OFFICE    |         4|In Progress     |      58|
OFFICE    |         1|Work Initiated  |      10|
OFFICE    |         3|Scheduled       |       5|
OFFICE    |         5|Finish          |       4|
OTH       |         9|History         |     625|
OTH       |         8|Cancelld        |     141|
OTH       |         4|In Progress     |      93|
OTH       |         1|Work Initiated  |      17|
OTH       |         5|Finish          |       5|
OTH       |         3|Scheduled       |       4|
PCM       |         9|History         |      34|
PCM       |         4|In Progress     |       4|
PCM       |         1|Work Initiated  |       2|
PCM       |         3|Scheduled       |       1|
PML1      |         9|History         |   72703|
PML1      |         8|Cancelld        |    2061|
PML1      |         3|Scheduled       |    2057|
PML1      |         5|Finish          |     233|
PML1      |         4|In Progress     |      23|
PML1      |         6|Close To History|      20|
PML1      |         1|Work Initiated  |      12|
PML2      |         9|History         |   40533|
PML2      |         8|Cancelld        |     837|
PML2      |         3|Scheduled       |     499|
PML2      |         4|In Progress     |     116|
PML2      |         5|Finish          |     115|
PML2      |         1|Work Initiated  |      38|
PML2      |         6|Close To History|       8|
PML3      |         9|History         |    9655|
PML3      |         8|Cancelld        |     542|
PML3      |         3|Scheduled       |     160|
PML3      |         4|In Progress     |      30|
PML3      |         6|Close To History|      13|
PML3      |         5|Finish          |       6|
PML3      |         1|Work Initiated  |       1|
SAFETY    |         9|History         |     527|
SAFETY    |         8|Cancelld        |     105|
SAFETY    |         1|Work Initiated  |      13|
SAFETY    |         4|In Progress     |      11|
SAFETY    |         5|Finish          |       2|
SAFETY    |         3|Scheduled       |       2|
WB        |         9|History         |      36|
WB        |         1|Work Initiated  |      16|
WB        |         5|Finish          |      10|
WB        |         4|In Progress     |       5|
WB        |         3|Scheduled       |       4|

######################################################################

Qurey:
SELECT 
    s.WOStatusNO,
    s.WOStatusName,
    COUNT(*) AS WO_Count
FROM dbo.WO w
INNER JOIN dbo.WOStatus s
    ON w.WOStatusNO = s.WOStatusNO
GROUP BY s.WOStatusNO, s.WOStatusName
ORDER BY WO_Count DESC;

Result:
WOStatusNO|WOStatusName    |WO_Count|
----------+----------------+--------+
         9|History         |  179636|
         8|Cancelld        |    6868|
         3|Scheduled       |    3038|
         4|In Progress     |    1929|
         5|Finish          |    1241|
         1|Work Initiated  |     528|
         6|Close To History|      41|
         2|Planed Resource |       1|

####################################################################################

Query:
WITH Prepared AS (
    SELECT
        w.WOStatusNO,
        w.SCH_FINISH_D,
        w.SCH_FINISH_T,
        w.ACT_FINISH_D,
        w.ACT_FINISH_T
    FROM dbo.WO w
),
Parsed AS (
    SELECT
        WOStatusNO,
        CASE 
            WHEN SCH_FINISH_D = '' OR SCH_FINISH_T = '' 
              OR ACT_FINISH_D = '' OR ACT_FINISH_T = '' 
            THEN 'NotComplete'
            ELSE 'Complete'
        END AS DataStatus,
        CASE 
            WHEN SCH_FINISH_D = '' OR SCH_FINISH_T = '' 
              OR ACT_FINISH_D = '' OR ACT_FINISH_T = '' 
            THEN NULL
            ELSE SCH_FINISH_D + SCH_FINISH_T
        END AS ScheduledDT,
        CASE 
            WHEN SCH_FINISH_D = '' OR SCH_FINISH_T = '' 
              OR ACT_FINISH_D = '' OR ACT_FINISH_T = '' 
            THEN NULL
            ELSE ACT_FINISH_D + ACT_FINISH_T
        END AS ActualDT
    FROM Prepared
),
Labeled AS (
    SELECT
        WOStatusNO,
        CASE 
            WHEN DataStatus = 'NotComplete' THEN 'NotComplete'
            WHEN ActualDT <= ScheduledDT THEN 'OnTime'
            ELSE 'Late'
        END AS TimingBucket
    FROM Parsed
)
SELECT
    s.WOStatusNO,
    s.WOStatusName,
    SUM(CASE WHEN TimingBucket = 'OnTime'     THEN 1 ELSE 0 END) AS OnTime_Count,
    SUM(CASE WHEN TimingBucket = 'Late'       THEN 1 ELSE 0 END) AS Late_Count,
    SUM(CASE WHEN TimingBucket = 'NotComplete'THEN 1 ELSE 0 END) AS NotComplete_Count,
    COUNT(*) AS Total_Rows
FROM Labeled l
JOIN dbo.WOStatus s ON s.WOStatusNO = l.WOStatusNO
GROUP BY s.WOStatusNO, s.WOStatusName
ORDER BY s.WOStatusNO;

Result:
WOStatusNO|WOStatusName    |OnTime_Count|Late_Count|NotComplete_Count|Total_Rows|
----------+----------------+------------+----------+-----------------+----------+
         1|Work Initiated  |           0|         4|              524|       528|
         2|Planed Resource |           0|         0|                1|         1|
         3|Scheduled       |           0|       523|             2515|      3038|
         4|In Progress     |           0|       168|             1761|      1929|
         5|Finish          |           8|       284|              949|      1241|
         6|Close To History|           0|         2|               39|        41|
         8|Cancelld        |          10|         0|             6858|      6868|
         9|History         |        1146|     27244|           151246|    179636|

##########################################################################################

query:
WITH Base AS (
    SELECT
        COALESCE(p.PERSON_NAME, '(Unassigned)') AS [Name],
        w.SCH_FINISH_D, w.SCH_FINISH_T,
        w.ACT_FINISH_D, w.ACT_FINISH_T
    FROM dbo.WO AS w
    LEFT JOIN dbo.Person AS p
        ON p.PERSONNO = w.ASSIGN   -- ASSIGN stores PERSONNO
),
Parsed AS (
    SELECT
        [Name],
        CASE 
            WHEN ISNULL(SCH_FINISH_D,'') = '' OR ISNULL(SCH_FINISH_T,'') = ''
              OR ISNULL(ACT_FINISH_D,'') = '' OR ISNULL(ACT_FINISH_T,'') = ''
            THEN 'NotComplete'
            ELSE 'Complete'
        END AS DataStatus,
        -- Only build datetimes for complete rows (YYYYMMDD + HHMMSS -> yyyy-mm-dd HH:MM:SS)
        CASE 
            WHEN ISNULL(SCH_FINISH_D,'') = '' OR ISNULL(SCH_FINISH_T,'') = '' THEN NULL
            ELSE SCH_FINISH_D+SCH_FINISH_T
        END AS ScheduledDT,
        CASE 
            WHEN ISNULL(ACT_FINISH_D,'') = '' OR ISNULL(ACT_FINISH_T,'') = '' THEN NULL
            ELSE ACT_FINISH_D+ACT_FINISH_T
        END AS ActualDT
    FROM Base
),
Labeled AS (
    SELECT
        [Name],
        CASE 
            WHEN DataStatus = 'NotComplete' THEN 'NotComplete'
            WHEN ActualDT <= ScheduledDT     THEN 'OnTime'
            ELSE 'Late'
        END AS TimingBucket
    FROM Parsed
)
SELECT
    [Name],
    SUM(CASE WHEN TimingBucket = 'OnTime'      THEN 1 ELSE 0 END) AS OnTime_Count,
    SUM(CASE WHEN TimingBucket = 'Late'        THEN 1 ELSE 0 END) AS Late_Count,
    SUM(CASE WHEN TimingBucket = 'NotComplete' THEN 1 ELSE 0 END) AS NotComplete_Count,
    COUNT(*)                                        AS Total_Rows
FROM Labeled
GROUP BY [Name]
ORDER BY [Name];

Result:
Name                       |OnTime_Count|Late_Count|NotComplete_Count|Total_Rows|
---------------------------+------------+----------+-----------------+----------+
(Unassigned)               |          32|        64|             6003|      6099|
Amporn Jirakiatdeekul      |           0|         0|                9|         9|
Anan Kobkratoke            |           0|         0|              883|       883|
Anuchit Sammuang           |           0|         0|               38|        38|
Anukul Somjai              |           1|        15|             1554|      1570|
Anurak Plongngern          |           5|        49|            10058|     10112|
Anuwat Lasoongnern         |           3|         1|              725|       729|
Anuwat Sawangsri           |           5|         1|             3983|      3989|
Apichart Chonsawad         |           1|         1|             4319|      4321|
Aree Tatongjai             |          28|        76|             3031|      3135|
Arnun Jantamat             |           2|         0|             3500|      3502|
Atid Yongrattanakit        |           0|         0|              100|       100|
Banchakorn Sukpia          |           0|         0|                7|         7|
Bunlert Thamniam           |           1|         0|             1548|      1549|
Bunlung Kenkhuntod         |           0|         0|                3|         3|
CEDAR SYSTEM               |           0|         1|                2|         3|
Chaivichit Somsing         |           0|         0|               21|        21|
Chaiwat Khunkaew           |         106|        23|             2408|      2537|
Chakkrit Siriwichai        |          33|        26|             1757|      1816|
Chirayuth Aumkeaw          |           4|         1|              957|       962|
Chitpol Srisai             |           0|         0|              488|       488|
Detchana Phoethong         |           0|         0|                1|         1|
Dry Reliability Green Team |           0|         0|              165|       165|
Dry reliability Red Team   |           3|         0|              322|       325|
Dusit Donchai              |           1|         0|              500|       501|
Eakasit Eamsombut          |           0|         0|               28|        28|
Ford Rueangklang           |           2|         0|             3607|      3609|
Jakkarin Jongraj           |           4|         1|              718|       723|
Jaroonsup  Kaewkudan       |           1|         0|              456|       457|
Jira Boonudom              |           0|         0|               33|        33|
Jiranuwat Hansut           |           0|         0|             1028|      1028|
Junlatep Khwanthong        |           2|         1|             1184|      1187|
Kamol Singprasert          |           0|         0|             3243|      3243|
KANOK CHANSUNGNOEN         |          74|      1789|            10090|     11953|
Kataleeya Keawsee          |           0|         0|                8|         8|
Kittipat Lohitthai         |           0|         0|              372|       372|
Kittipon Arrisucharitlak   |           0|         2|             3603|      3605|
Kriangkrai Nuangkaew       |           0|         0|               19|        19|
Kritsana Sinmai            |           2|         3|              802|       807|
Kritsanapan Kankaew        |           0|         0|                1|         1|
Manklavuth Runghom         |           0|         0|                2|         2|
Matipon Pannok             |           0|         0|              137|       137|
Montri Kerdprom            |           0|         0|                1|         1|
Narong Chomklang           |           0|         0|                1|         1|
Narong Phumphuang          |           0|         0|               17|        17|
Narongrit Chosungnoen      |           0|         0|               18|        18|
Narongsak Prathumtip       |          16|        27|              379|       422|
Nathipong Vicheanlert      |           0|         0|             2667|      2667|
Nattachanaphong Lueamnok   |           0|         0|              858|       858|
Nattapong Kuankerd         |           0|         1|              176|       177|
Nattawut Sriutha           |           1|         2|              140|       143|
Natthaphong Phanwiset      |           0|         0|              448|       448|
Natthapong Chevavisuttichai|           0|        34|              666|       700|
Nikorn Piromcharern        |           0|         0|                8|         8|
Nisit Julapan              |         146|      3476|             2318|      5940|
Nitchawan Sonsunant        |           1|         0|                4|         5|
Niwat Kanjanapoom          |           6|         1|            14600|     14607|
Noppadon Masman            |          41|        71|            15395|     15507|
Panya Kanenok              |           0|         0|              240|       240|
Phonpop Jangpai            |           4|         0|             1255|      1259|
Phudit Suppakritkanont     |           0|         0|               34|        34|
Picharn Aonjan             |           2|         0|              111|       113|
Pichet Bongoolueam         |          14|        51|             3088|      3153|
Piyaporn Somsong           |           0|         0|                1|         1|
Pongpat Pravudhikul        |           0|         0|               13|        13|
Pongtorn Chaiburam         |           0|         0|              484|       484|
Ponsin Fookamnerd          |           3|         1|             2240|      2244|
Pramoch Phupiwpha          |           2|         1|              795|       798|
Prapaijit Hanklang         |           0|         0|                1|         1|
Prasert Chantorn           |           0|         0|               67|        67|
Prateep Petchnil           |          25|         2|             4418|      4445|
Prayot Pornsungnern        |           0|         0|               10|        10|
Rattana Limpapawich        |           0|         0|                1|         1|
Richard Merrick            |           0|         0|                1|         1|
Sainam Rit-im              |           0|         0|              299|       299|
Sanit Thongwisat           |           0|         0|             2410|      2410|
Santichai Ruanma           |           0|         0|                1|         1|
Sarawut Khamarb            |          65|        33|             4532|      4630|
Sasithorn Methaweesunsern  |           0|         0|                1|         1|
seksun thoopthianthong     |           1|         1|              146|       148|
Sidaphat Ployma            |           0|         0|               14|        14|
Smit Choakwattanakul       |           0|         0|                4|         4|
SODEXO PCH Site            |           0|         0|                1|         1|
Somjet Surbsunti           |           0|         0|               24|        24|
Somphop Homying            |           0|         0|                1|         1|
Somwong Peawpromarat       |         296|      1541|             3692|      5529|
Soontorn Juntorn           |          43|       131|             3672|      3846|
Sorraset Wongtanaboon      |           0|         5|               87|        92|
Subancha Ounsoongnern      |           0|         0|              755|       755|
Suchat Sasudsee            |          29|         0|              169|       198|
Supachai Neamkam           |          14|         0|             1680|      1694|
Supadesh Ussayaporn        |           0|         0|                6|         6|
Surakarn Klaiklang         |           1|         0|              339|       340|
Surapan Sumalai            |          11|         0|             1403|      1414|
Surasak Rakpetch           |           3|         0|             5400|      5403|
Sureewat Srili             |           5|         0|               76|        81|
Sutat Jaithieng            |           3|         5|             1582|      1590|
Suttichat Apainok          |           0|         0|                5|         5|
Suwit Phungoenkhan         |           1|         0|               29|        30|
Tanaphong Laowdee          |           1|         0|             2989|      2990|
Tanee Dongna               |           0|         0|                1|         1|
Tawan Choosri              |           2|         0|             2596|      2598|
TEST01 DUMMY               |           0|         0|                4|         4|
TEST03 DUMMY               |           0|         0|                1|         1|
Thanongsak Limweshasin     |           0|         0|                2|         2|
Thiraput Samarnpong        |           1|         1|              304|       306|
Thongchai Boonart          |           0|         4|             1934|      1938|
Thuanthong Sinpaksa        |           0|         0|                1|         1|
Tongchai Lekhajaroenkul    |           0|         0|                6|         6|
Tossapol Chotwatcharin     |           0|         0|               43|        43|
Udorn Srijan               |           0|         0|             1319|      1319|
Ukrit Srikwan              |           0|         0|                1|         1|
Unknown Unknown            |           0|         0|               15|        15|
Uthai Hompanna             |           2|         3|              330|       335|
Veerapong Phongrassamee    |           0|         0|                1|         1|
Vijit Boonchu              |           0|         0|                1|         1|
Vorayut Pratumma           |           0|         0|               78|        78|
Wanchai Ubolban            |          38|       218|             4381|      4637|
Wanchana Sriratat          |           4|         0|              220|       224|
Wasan Wongno               |           0|         0|                1|         1|
Watcharavit Sirachocvarun  |           6|         2|             4856|      4864|
Water Treatment            |          16|       113|             1206|      1335|
Wattapol Julkoh            |          38|         1|             1233|      1272|
Werawat Phasom             |           1|         0|              234|       235|
Widsanu Choedsoongnoen     |           1|         0|            13133|     13134|
Wikrut Tawong              |           1|         1|             2180|      2182|
Wipawadee Chunvijitra      |           0|         0|                1|         1|
Wirat Maliwan              |           0|         0|                6|         6|
Wirot Aree                 |           0|         0|                1|         1|
Wisan Muikeao              |           0|         0|               13|        13|
Worachai Sudjai            |           2|         0|                1|         3|
Worapot Puvasawat          |           5|         0|             1420|      1425|
XUdorn Xsrijan             |           3|         1|             1353|      1357|

##########################################################################################
Qurey:
WITH Base AS (
    SELECT
        COALESCE(p.PERSON_NAME, '(Unassigned)') AS [Name],
        w.SCH_FINISH_D, w.SCH_FINISH_T,
        w.ACT_FINISH_D, w.ACT_FINISH_T
    FROM dbo.WO AS w
    LEFT JOIN dbo.Person AS p
        ON p.PERSONNO = w.REPAIRBY   -- ASSIGN stores PERSONNO
),
Parsed AS (
    SELECT
        [Name],
        CASE 
            WHEN ISNULL(SCH_FINISH_D,'') = '' OR ISNULL(SCH_FINISH_T,'') = ''
              OR ISNULL(ACT_FINISH_D,'') = '' OR ISNULL(ACT_FINISH_T,'') = ''
            THEN 'NotComplete'
            ELSE 'Complete'
        END AS DataStatus,
        -- Only build datetimes for complete rows (YYYYMMDD + HHMMSS -> yyyy-mm-dd HH:MM:SS)
        CASE 
            WHEN ISNULL(SCH_FINISH_D,'') = '' OR ISNULL(SCH_FINISH_T,'') = '' THEN NULL
            ELSE SCH_FINISH_D+SCH_FINISH_T
        END AS ScheduledDT,
        CASE 
            WHEN ISNULL(ACT_FINISH_D,'') = '' OR ISNULL(ACT_FINISH_T,'') = '' THEN NULL
            ELSE ACT_FINISH_D+ACT_FINISH_T
        END AS ActualDT
    FROM Base
),
Labeled AS (
    SELECT
        [Name],
        CASE 
            WHEN DataStatus = 'NotComplete' THEN 'NotComplete'
            WHEN ActualDT <= ScheduledDT     THEN 'OnTime'
            ELSE 'Late'
        END AS TimingBucket
    FROM Parsed
)
SELECT
    [Name],
    SUM(CASE WHEN TimingBucket = 'OnTime'      THEN 1 ELSE 0 END) AS OnTime_Count,
    SUM(CASE WHEN TimingBucket = 'Late'        THEN 1 ELSE 0 END) AS Late_Count,
    SUM(CASE WHEN TimingBucket = 'NotComplete' THEN 1 ELSE 0 END) AS NotComplete_Count,
    COUNT(*)                                        AS Total_Rows
FROM Labeled
GROUP BY [Name]
ORDER BY [Name];

Repair:
Name                        |OnTime_Count|Late_Count|NotComplete_Count|Total_Rows|
----------------------------+------------+----------+-----------------+----------+
(Unassigned)                |           5|         8|              802|       815|
ADMIN SYSTEM                |           0|         0|                4|         4|
Amnaj Woonpolsombat         |           0|         0|                1|         1|
Amnuay Kamtonglang          |           0|         0|                9|         9|
Amporn Jirakiatdeekul       |           0|         0|               11|        11|
Anan Kobkratoke             |           0|         0|              684|       684|
Anuchit Sammuang            |           2|         1|               94|        97|
Anukul Somjai               |           1|        10|             1670|      1681|
Anurak Plongngern           |          40|       234|             9100|      9374|
Anuwat Lasoongnern          |           6|         7|              712|       725|
Anuwat Sawangsri            |           6|         1|             3891|      3898|
Apichart Chonsawad          |           1|         0|             4121|      4122|
Aree Tatongjai              |          26|        74|             2312|      2412|
Arnun Jantamat              |           2|         0|             4323|      4325|
Ashira Wongsubun            |           0|         0|                1|         1|
Atid Yongrattanakit         |           0|         0|               82|        82|
Banchakorn Sukpia           |           0|         0|               50|        50|
benyatip udomtaweetanawat   |           0|         0|                3|         3|
Boonprasert Mungkokrang     |           0|         0|                3|         3|
Bunchit Khaodin             |           0|         0|               13|        13|
Bunlert Thamniam            |           1|         0|             1355|      1356|
Bunlung Kenkhuntod          |           0|         0|               18|        18|
Chaivichit Somsing          |           0|         0|               15|        15|
Chaiwat Khunkaew            |         104|        33|             3460|      3597|
Chaiwut Sintuwongsanon      |           0|         0|                6|         6|
Chakkrit Siriwichai         |          40|        30|             2283|      2353|
Chaleampol Kinking          |           0|         0|                7|         7|
Chalermpol Promkawtor       |           0|         0|                1|         1|
Chana Klinklang             |           0|         0|                3|         3|
Chanachai Chaunsook         |           0|         0|                2|         2|
Chanchai Saengwiset         |           0|         0|               15|        15|
Chaninton Puagpan           |           0|         0|                3|         3|
Charoen Pusatuen            |           0|         0|                4|         4|
Chatmongkol Sriwichai       |           0|         0|                8|         8|
Chirayuth Aumkeaw           |           2|         0|             1138|      1140|
Chitpol Srisai              |           0|         0|              222|       222|
Chonlawit Saelao            |           0|         0|                2|         2|
Detchana Phoethong          |           0|         0|                4|         4|
Dry Reliability Green Team  |           0|         0|              165|       165|
Dry reliability Red Team    |           4|         0|              255|       259|
Dusit Donchai               |           1|         0|              459|       460|
Eakasit Eamsombut           |           0|         0|               28|        28|
Eakkarin Promjuntuk         |           0|         0|               19|        19|
Ford Rueangklang            |           2|         0|             2059|      2061|
Jakkapong Wannapanom        |           0|         0|                2|         2|
Jakkarin Jongraj            |           6|         2|              871|       879|
Jaklen Puttraksa            |           0|         0|                6|         6|
Jaroonsup  Kaewkudan        |           1|         0|              448|       449|
Jarunee Jeekum              |           0|         0|                1|         1|
Jeerawat Koseyayotin        |           0|         0|               40|        40|
Jira Boonudom               |           0|         1|               74|        75|
Jiranuwat Hansut            |           0|         0|              781|       781|
Jittipong YodsaNga          |           0|         0|                6|         6|
Junlatep Khwanthong         |           1|         1|             1173|      1175|
Kamol Singprasert           |           0|         0|             3219|      3219|
KANOK CHANSUNGNOEN          |          67|      1687|             9441|     11195|
Kataleeya Keawsee           |           1|         0|               17|        18|
Khanpapohp Hongvilai        |           0|         0|                1|         1|
Kitipan Pajit               |           0|         0|                2|         2|
Kitsada Songkrasin          |           0|         0|                2|         2|
Kittipat Lohitthai          |           2|         2|              465|       469|
Kittipon Arrisucharitlak    |           6|        15|             3576|      3597|
Komin Nonpo                 |           0|         0|                6|         6|
Krailas Kotta               |           0|         0|                1|         1|
Kriangkrai Nuangkaew        |           0|         0|               15|        15|
Kriengsak Klaowklang        |           0|         0|                6|         6|
Krisada Hongthong           |           0|         0|              138|       138|
Kritsana Sinmai             |           0|         0|              464|       464|
Kritsanapan Kankaew         |           0|         0|                1|         1|
Kwanchai Ketsup             |           0|         0|                5|         5|
Lampuan Puengkhuntod        |           0|         0|                4|         4|
Manklavuth Runghom          |           0|         0|                2|         2|
Matipon Pannok              |           0|         0|              132|       132|
Montri Thaicharoensuk       |           0|         0|                2|         2|
Narong Chomklang            |           0|         0|                1|         1|
Narong Phumphuang           |           0|         0|               12|        12|
Narongdes Changsri          |           0|         0|                1|         1|
Narongrit Chosungnoen       |           0|         0|               18|        18|
Narongsak Prathumtip        |           0|         0|              207|       207|
Nathipong Vicheanlert       |           0|         0|             2931|      2931|
Nattachanaphong Lueamnok    |           0|         1|              831|       832|
Nattapong Kuankerd          |           0|         1|              175|       176|
Nattawut Sriutha            |           0|         0|                1|         1|
Natthaphong Phanwiset       |           0|         0|              242|       242|
Natthapong Chevavisuttichai |           0|        34|              528|       562|
Nikorn Kinking              |           0|         0|                2|         2|
Nikorn Piromcharern         |           1|         0|                8|         9|
Niphatlada Sriwanitwong     |           0|         0|                1|         1|
Nirutti Panya               |           0|         0|                6|         6|
Nisit Julapan               |         138|      3457|             2206|      5801|
Nitchawan Sonsunant         |           2|         0|               18|        20|
Niwat Kanjanapoom           |           6|         1|             9029|      9036|
Noppadon Masman             |          40|        67|            19851|     19958|
Noppadon Popinath           |           0|         0|               20|        20|
Ong - Art Kamkaew           |           0|         0|                8|         8|
Paak Nakpeerayuth           |           0|         0|                2|         2|
Pachara Chomchoho           |           0|         0|                6|         6|
Pairat Supadet              |           0|         0|                2|         2|
Paitoon Boonlom             |           0|         0|                2|         2|
Paitoon Panngern            |           1|         0|               26|        27|
Panya Kanenok               |           0|         0|              242|       242|
Parat Chansungnoen          |           0|         0|               38|        38|
Permporn Saardchai          |           0|         0|                2|         2|
Phonpop Jangpai             |           4|         0|              997|      1001|
Picharn Aonjan              |           0|         0|               58|        58|
Pichet Bongoolueam          |          10|        45|             2732|      2787|
Pinit Praneetponkrung       |           0|         0|                2|         2|
Pongpat Pravudhikul         |           0|         0|               13|        13|
Pongsakorn Hanpoom          |           0|         0|                1|         1|
Pongtorn Chaiburam          |           0|         0|              360|       360|
Ponsin Fookamnerd           |           4|         1|             1091|      1096|
Pornchai Choothong          |           0|         0|                1|         1|
Pornthep Tiansiri           |           0|         0|               45|        45|
Pramoch Phupiwpha           |           2|         3|             1096|      1101|
Prapaipun Emawattana        |           0|         0|               33|        33|
Prasert Aksornthong         |           0|         0|               13|        13|
Prasert Chantorn            |           0|         0|               65|        65|
Prateep Petchnil            |          18|         1|             3029|      3048|
Prayot Pornsungnern         |          22|        27|              527|       576|
Ravee Phakum                |           2|         0|               10|        12|
Richard Merrick             |           0|         0|                1|         1|
Sainam Rit-im               |           2|         2|              460|       464|
Samaporn Gongvong           |           0|         0|                1|         1|
Sanit Thongwisat            |           0|         0|             2412|      2412|
Sanitation PCH              |           0|         0|               17|        17|
Santi Klanklin              |           0|         0|                9|         9|
Santichai Ruanma            |           0|         0|                9|         9|
Sarawut Khamarb             |          64|        33|             4468|      4565|
Sarawut Phomsiriboon        |           0|         0|                3|         3|
Sasithorn Methaweesunsern   |           0|         1|                4|         5|
seksun thoopthianthong      |           0|         0|               81|        81|
Setthasit Kindoung          |           0|         0|               25|        25|
Shatsha YodsaNga            |           0|         0|                2|         2|
Sidaphat Ployma             |           0|         0|               17|        17|
Smit Choakwattanakul        |           0|         0|                2|         2|
Solod Rungjang              |           0|         0|                1|         1|
Somjet Ketchalarat          |           0|         0|                5|         5|
Somjet Surbsunti            |           0|         0|               25|        25|
Somkid Popanya              |           0|         0|                6|         6|
Somneuk Artsit              |           0|         0|               11|        11|
Somphob Niljantuik          |           0|         0|               20|        20|
Somphol Sansuk              |           0|         0|               63|        63|
Somphop Homying             |           0|         0|               26|        26|
Somsak Homsuk               |           0|         0|                5|         5|
Somwong Peawpromarat        |         328|      1620|             6041|      7989|
Soontorn Juntorn            |           1|         0|             3559|      3560|
Sorapong Narin              |           0|         0|                7|         7|
Sorraset Wongtanaboon       |           0|         5|               86|        91|
Srisupap Sapapag            |           0|         0|                7|         7|
Subancha Ounsoongnern       |           0|         0|              703|       703|
Suchart Mungtoklang         |           0|         0|                4|         4|
Suchat Sasudsee             |          29|         0|              171|       200|
Sujin Dasoongnern           |           0|         0|                5|         5|
Sumate Chaiwichit           |           0|         0|                1|         1|
Sunchai Sangchay            |           0|         0|              103|       103|
Supachai Neamkam            |          22|         1|              388|       411|
Supadesh Ussayaporn         |           0|         0|                6|         6|
Surakarn Klaiklang          |           1|         0|              368|       369|
Surapan Pimpa               |           0|         0|               48|        48|
Surapan Sumalai             |          11|         0|                5|        16|
Surasak Rakpetch            |           3|         0|             5701|      5704|
Surasit Pradapwan           |           1|         0|                2|         3|
Sureewat Srili              |           5|         0|               70|        75|
Sutat Jaithieng             |           9|        18|             7076|      7103|
Suttichat Apainok           |           0|         0|                4|         4|
Suwit Phungoenkhan          |           1|         0|               10|        11|
Tanakorn Srisa              |           0|         0|                9|         9|
Tanaphong Laowdee           |           0|         0|             2925|      2925|
Tanee Dongna                |           0|         0|               15|        15|
Tanongsak Yaisingson        |           0|         0|                3|         3|
Tawan Choosri               |           2|         0|             1729|      1731|
Taweesak Chumsri            |           0|         0|               13|        13|
TEST01 DUMMY                |           0|         0|                6|         6|
TEST02 DUMMY                |           0|         0|                4|         4|
TEST-02 DUMMY               |           0|         0|                1|         1|
TEST03 DUMMY                |           0|         0|                1|         1|
Thanapon Phusompong         |           0|         0|                5|         5|
Thanongsak Limweshasin      |           0|         0|                2|         2|
Thanudcha Phacharadanaisakul|           0|         0|                2|         2|
Thawatchai Thanarungsakul   |           0|         0|               19|        19|
Thiraput Samarnpong         |           1|         0|              286|       287|
Thongchai Boonart           |           0|         0|             1627|      1627|
Thongchai Jittrong          |           0|         0|                1|         1|
Thuanthong Sinpaksa         |           0|         0|               57|        57|
Tiwakorn Saenphimon         |           0|         0|              270|       270|
Tossapol Chotwatcharin      |           0|         0|               43|        43|
Udomchoke Phangsungnern     |           0|         0|               17|        17|
Udompong Mungdee            |           0|         0|                1|         1|
Udomrat Klibngoen           |           0|         0|                1|         1|
Udorn Srijan                |           0|         0|             1298|      1298|
Ukrit Srikwan               |           0|         0|                4|         4|
Uthai Hompanna              |           1|         2|              386|       389|
Vachira Sedpeng             |           0|         0|               44|        44|
Veerapong Phongrassamee     |           0|         0|                6|         6|
Veerayar Pongsomboon        |           0|         0|                1|         1|
Vorayut Pratumma            |           0|         0|               83|        83|
Wanchai Ubolban             |          36|       227|             4993|      5256|
Wanchana Meenajit           |           0|         0|                3|         3|
Wanchana Sriratat           |           4|         0|              266|       270|
Wanwilai Poonok             |           0|         0|                1|         1|
Waraphon Sonchue            |           0|         0|                2|         2|
Warunee Katseesai           |           0|         0|                1|         1|
Wasan Wongno                |           0|         0|                2|         2|
Watcharavit Sirachocvarun   |           6|         4|             3919|      3929|
Water Treatment             |          15|       116|             1080|      1211|
Wattapol Julkoh             |          38|         0|             1226|      1264|
Weeraphon Chimwai           |           0|         0|               12|        12|
Weerayuth Yurasri           |           0|         0|                3|         3|
Werawat Phasom              |           0|         0|              270|       270|
Wichian Chaiphiphat         |           0|         0|                8|         8|
Widsanu Choedsoongnoen      |           1|         0|            20612|     20613|
Wikrut Tawong               |           2|         3|             2039|      2044|
Wipawadee Chunvijitra       |           0|         0|                1|         1|
Wirat Maliwan               |           0|         0|                9|         9|
Wirot Aree                  |           0|         0|                8|         8|
Wisan Muikeao               |           0|         1|               24|        25|
Wisit Sudjai                |           0|         0|                9|         9|
Wiwan KARAHUS               |           0|         0|               16|        16|
Worachai Sudjai             |           2|         0|                1|         3|
Worapot Puvasawat           |           1|         4|             1378|      1383|
Worapot Tasutin             |           0|         0|                1|         1|
XUdorn Xsrijan              |           1|         0|              773|       774|

##########################################################################################

create sp:
USE Cedar6_Mars;
GO

IF OBJECT_ID('dbo.sp_GetMonthlyWOByUser', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GetMonthlyWOByUser;
GO

CREATE PROCEDURE dbo.sp_GetMonthlyWOByUser
    @WOTypeNO INT,
    @StartDate CHAR(8) = NULL,   -- format YYYYMMDD
    @EndDate   CHAR(8) = NULL    -- format YYYYMMDD
AS
BEGIN
    SET NOCOUNT ON;

    /* 1) Build base set */
    IF OBJECT_ID('tempdb..#Base') IS NOT NULL DROP TABLE #Base;
    SELECT
        [Range] = LEFT(w.SCH_FINISH_D, 6),              -- YYYYMM
        [User]  = COALESCE(p.PERSON_NAME, '(Unassigned)'),
        w.WONO
    INTO #Base
    FROM dbo.WO AS w
    LEFT JOIN dbo.Person AS p
        ON p.PERSONNO = w.ASSIGN
    WHERE w.WOTypeNO = @WOTypeNO
      AND ISNULL(w.SCH_FINISH_D,'') <> ''
      AND (@StartDate IS NULL OR w.SCH_FINISH_D >= @StartDate)
      AND (@EndDate   IS NULL OR w.SCH_FINISH_D <= @EndDate);

    /* 2) Collect distinct users as pivot columns */
    DECLARE @cols NVARCHAR(MAX);
    SET @cols = STUFF((
        SELECT DISTINCT ',' + QUOTENAME([User])
        FROM #Base
        FOR XML PATH(''), TYPE
    ).value('.', 'nvarchar(max)'), 1, 1, '');

    /* 3) Build dynamic pivot SQL */
    DECLARE @sql NVARCHAR(MAX) = N'
    SELECT [Range], ' + @cols + N'
    FROM (
        SELECT [Range], [User], COUNT(WONO) AS WO_Count
        FROM #Base
        GROUP BY [Range], [User]
    ) AS src
    PIVOT (
        SUM(WO_Count) FOR [User] IN (' + @cols + N')
    ) AS p
    ORDER BY [Range];';

    /* 4) Execute */
    EXEC sp_executesql @sql;
END;
GO

execute sp:
-- All periods for WOTypeNO = 1
EXEC dbo.sp_GetMonthlyWOByUser @WOTypeNO = 1;

-- Limit to 2025 only
EXEC dbo.sp_GetMonthlyWOByUser @WOTypeNO = 1, @StartDate = '20250101', @EndDate = '20251231';

result:
Range |Sureewat Srili|Soontorn Juntorn|
------+--------------+----------------+---         
201409|              |                |            
201501|              |                |            
201502|              |              10|            
201503|              |              33|            
201504|              |              20|            
201505|              |              38|            
201506|              |              29|            
201507|              |              32|            
201508|              |              30|            
201509|              |              35|            
201510|              |              42|            
201511|              |              44|            
201512|              |              22|            
201601|              |              27|            

##########################################################################################
create sp:
USE Cedar6_Mars;
GO

IF OBJECT_ID('dbo.sp_GetWOStatusByUser', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GetWOStatusByUser;
GO

CREATE PROCEDURE dbo.sp_GetWOStatusByUser
    @StartDate         CHAR(8) = NULL,   -- YYYYMMDD
    @EndDate           CHAR(8) = NULL,   -- YYYYMMDD
    @IncludeUnassigned BIT    = 1,       -- 1 = keep "(Unassigned)" rows, 0 = exclude
    @WOTypeNO          INT     = NULL    -- NULL = all types; else filter
AS
BEGIN
    SET NOCOUNT ON;

    /* Build base rows filtered by period and type */
    IF OBJECT_ID('tempdb..#Base') IS NOT NULL DROP TABLE #Base;

    SELECT
        [User] = COALESCE(p.PERSON_NAME, '(Unassigned)'),
        s.WOStatusName,
        w.WONO
    INTO #Base
    FROM dbo.WO AS w
    LEFT JOIN dbo.Person  AS p ON p.PERSONNO = w.ASSIGN
    INNER JOIN dbo.WOStatus AS s ON s.WOStatusNO = w.WOStatusNO
    WHERE ISNULL(w.SCH_FINISH_D,'') <> ''                           -- has period
      AND (@StartDate IS NULL OR w.SCH_FINISH_D >= @StartDate)      -- YYYYMMDD compare
      AND (@EndDate   IS NULL OR w.SCH_FINISH_D <= @EndDate)
      AND (@IncludeUnassigned = 1 OR w.ASSIGN IS NOT NULL)          -- optionally drop unassigned
      AND (@WOTypeNO IS NULL OR w.WOTypeNO = @WOTypeNO);            -- optional type filter

    /* Build status column list from ALL statuses */
    DECLARE @cols NVARCHAR(MAX);
    DECLARE @colsIsNull NVARCHAR(MAX);

    SET @cols = STUFF((
        SELECT ',' + QUOTENAME(s.WOStatusName)
        FROM dbo.WOStatus AS s
        ORDER BY s.WOStatusNO
        FOR XML PATH(''), TYPE).value('.', 'nvarchar(max)'), 1, 1, '');

    SET @colsIsNull = STUFF((
        SELECT ',ISNULL(' + QUOTENAME(s.WOStatusName) + ',0) AS ' + QUOTENAME(s.WOStatusName)
        FROM dbo.WOStatus AS s
        ORDER BY s.WOStatusNO
        FOR XML PATH(''), TYPE).value('.', 'nvarchar(max)'), 1, 1, '');

    IF @cols IS NULL OR LEN(@cols) = 0
    BEGIN
        SELECT DISTINCT [User] FROM #Base ORDER BY [User];
        RETURN;
    END;

    /* Dynamic pivot */
    DECLARE @sql NVARCHAR(MAX) = N'
    WITH agg AS (
        SELECT [User], WOStatusName, COUNT(WONO) AS WO_Count
        FROM #Base
        GROUP BY [User], WOStatusName
    )
    SELECT [User], ' + @colsIsNull + N'
    FROM agg
    PIVOT (
        SUM(WO_Count) FOR WOStatusName IN (' + @cols + N')
    ) p
    ORDER BY [User];';

    EXEC sp_executesql @sql;
END
GO

run:
-- All types, whole available range
EXEC dbo.sp_GetWOStatusByUser;

-- Filter by WOTypeNO = 1, Jan–Mar 2025, include unassigned
EXEC dbo.sp_GetWOStatusByUser
  @StartDate='20250101', @EndDate='20250331',
  @IncludeUnassigned=1, @WOTypeNO=1;

-- All types in 2025, exclude unassigned
EXEC dbo.sp_GetWOStatusByUser
  @StartDate='20250101', @EndDate='20251231',
  @IncludeUnassigned=0, @WOTypeNO=NULL;

Result:
User                       |Work Initiated|Planed Resource|Scheduled|In Progress|Finish|Close To History|Cancelld|History|
---------------------------+--------------+---------------+---------+-----------+------+----------------+--------+-------+
(Unassigned)               |             2|              0|        0|          0|     2|               0|    2439|   3278|
Anan Kobkratoke            |             0|              0|       23|          3|     0|               0|       0|    856|
Anuchit Sammuang           |             3|              0|        0|          4|     0|               0|       2|     20|
Anukul Somjai              |             1|              0|       23|          6|    20|               0|       1|   1519|
Anurak Plongngern          |            12|              0|      116|         25|    13|               0|      19|   9779|
Anuwat Lasoongnern         |             8|              0|       13|          9|     0|               0|      18|    465|
Anuwat Sawangsri           |             4|              0|       27|          9|     5|               0|     100|   3128|
Apichart Chonsawad         |             0|              0|       40|          1|    22|               0|       6|   4170|
Aree Tatongjai             |            60|              0|      675|         36|     9|               0|      11|   1772|
Arnun Jantamat             |            10|              0|        2|         43|     0|               0|       2|   3445|
Banchakorn Sukpia          |             0|              0|        0|          0|     0|               0|       1|      0|

#############################################################################################################################

sp:
dbo.Dashboard_Backlog_Assign
run:
EXEC dbo.sp_Dashboard_Backlog_Assign @SiteNo = 3
result:
WOStatusName    |WOStatusNo|DEPTCODE|Cnt|Total|
----------------+----------+--------+---+-----+
Scheduled       |         3|REL-DRY |594| 2360|
Finish          |         5|REL-DRY |782| 2360|
In Progress     |         4|REL-DRY |796| 2360|
Close To History|         6|REL-DRY |  1| 2360|
Work Initiated  |         1|REL-DRY |187| 2360|
Scheduled       |         3|REL-PP  |760| 1390|
Work Initiated  |         1|REL-PP  | 78| 1390|
In Progress     |         4|REL-PP  |291| 1390|
Finish          |         5|REL-PP  |221| 1390|
Close To History|         6|REL-PP  | 40| 1390|
Planed Resource |         2|UTILITY |  1| 1377|
Scheduled       |         3|UTILITY |843| 1377|
Finish          |         5|UTILITY | 99| 1377|
Work Initiated  |         1|UTILITY |139| 1377|
In Progress     |         4|UTILITY |295| 1377|
Scheduled       |         3|EE&CTRL |533| 1173|
Work Initiated  |         1|EE&CTRL |101| 1173|
Finish          |         5|EE&CTRL |100| 1173|
In Progress     |         4|EE&CTRL |439| 1173|
Work Initiated  |         1|SDX     |  8|  331|
Scheduled       |         3|SDX     |306|  331|
In Progress     |         4|SDX     | 16|  331|
Finish          |         5|SDX     |  1|  331|
Finish          |         5|PRO-DRY | 35|   80|
Scheduled       |         3|PRO-DRY |  1|   80|
In Progress     |         4|PRO-DRY | 35|   80|
Work Initiated  |         1|PRO-DRY |  9|   80|
Work Initiated  |         1|STORE   |  3|   56|
In Progress     |         4|STORE   | 53|   56|
Finish          |         5|PRO-PP  |  3|    6|
In Progress     |         4|PRO-PP  |  1|    6|
Work Initiated  |         1|PRO-PP  |  2|    6|
In Progress     |         4|MFG-SDP |  2|    2|
In Progress     |         4|MFG-RDP |  1|    1|
Work Initiated  |         1|R&D     |  1|    1|
Scheduled       |         3|MFG-SUT |  1|    1|


sp:
dbo.Dashboard_Backlog_Assign_LV1
run:
EXEC dbo.sp_Dashboard_Backlog_Assign_LV1 @SiteNo = 3, @DeptCode = "REL-PP"
result:
WONO  |WoCode     |DEPTNO|WRDATE                 |DFR  |WOSTATUSNO|WOSTATUSCODE       |WOSTATUSNAME  |WODATE                 |DEPTCODE|DEPTNAME         |WOTYPECODE|WOTYPENAME            |PRIORITYNO|PRIORITYCODE|PRIORITYNAME |WRNO |REFWRCode      |PMNO |REFPMCode                |PUNO|PUCode         |PUName                                             |EQNO|EQCode|EQName|Symptom                                                                                                                                                                                                                                                        |FlagPUDown|aiFlagPUDown|PUNO_Effected|PUEffectedCode |PUEffectedName            |adSymptomDTSDate       |asSymptomDTSDate|asSymptomDTSTime|adSymptomDTFDate       |asSymptomDTFDate|asSymptomDTFTime|DT_Duration|adSchSDate             |SchSDate               |adSchFDate             |SchFDate               |WaitForShutDown|WaitForMaterial|WaitForOther|Assign|PlanCode|PlanFirstName|SCH_DURATION|SiteNo|ManHour|WRURGENTCODE|WRURGENTNAME|WFStatusCode          |PULOCTYPENAME|
------+-----------+------+-----------------------+-----+----------+-------------------+--------------+-----------------------+--------+-----------------+----------+----------------------+----------+------------+-------------+-----+---------------+-----+-------------------------+----+---------------+---------------------------------------------------+----+------+------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+----------+------------+-------------+---------------+--------------------------+-----------------------+----------------+----------------+-----------------------+----------------+----------------+-----------+-----------------------+-----------------------+-----------------------+-----------------------+---------------+---------------+------------+------+--------+-------------+------------+------+-------+------------+------------+----------------------+-------------+
201636|WO24-000002|    24|2024-01-23 00:00:00.000|  591|         5|Finish (70)        |Finish        |2024-01-23 00:00:00.000|REL-PP  |Reliability Pouch|CM        |CORRECTIVE MAINTENANCE|         0|            |             |67385|WR24-000003    |    0|                         | 875|PP-FILA-VOLP-01|Volumetic Pump of Filler 1                         |   0|      |      |pump leak                                                                                                                                                                                                                                                      |T         |           1|          875|PP-FILA-VOLP-01|Volumetic Pump of Filler 1|2024-01-23 00:00:00.000|20240123        |1000            |2024-01-23 00:00:00.000|20240123        |1530            |      330.0|                       |                       |                       |                       |              0|              0|           0|     0|        |             |        0.00|     3|   0.30|            |            |70-1 Work Finish      |             |
201637|WO24-000003|    24|2024-01-23 00:00:00.000|  591|         1|Work Initiated (10)|Work Initiated|2024-01-23 00:00:00.000|REL-PP  |Reliability Pouch|BM        |BREAKDOWN MAINTENANCE |         0|            |             |67386|WR24-000004    |    0|                         |4057|PP-EMUA-EMUL-11|Inotec  Emulsifier of OFM2                         |   0|      |      |Test                                                                                                                                                                                                                                                           |T         |           1|         4057|PP-EMUA-EMUL-11|Inotec  Emulsifier of OFM2|2024-01-23 00:00:00.000|20240123        |1538            |                       |                |                |        0.0|                       |                       |                       |                       |              0|              0|           0|     0|        |             |        0.00|     3|       |            |            |10-1 WO generated (BM)|PP           |
201192|PM23-000007|    24|2023-01-24 00:00:00.000|  955|         3|Scheduled (30)     |Scheduled     |2023-07-13 00:00:00.000|REL-PP  |Reliability Pouch|PML1      |PREVENTIVE LEVEL 1    |         0|            |             |    0|PP-PACK-INKJ-01| 5236|PP-PACK-INKJ-01          |1106|PP-PACK-INKJ-01|Ink jet Printer of Packing No1                     |   0|      |      |PM Inspection  Ink jet Printer of Packing No 1                                                                                                                                                                                                                 |F         |           0|             |               |                          |                       |                |                |                       |                |                |           |2023-01-24 00:00:00.000|2023-01-24 00:00:00.000|2023-01-24 00:00:00.000|2023-01-24 00:00:00.000|              0|              0|           0|   132|2-316   |Kamol        |        0.00|     3|   0.00|            |            |30-1 Work Planned (PM)|PACKING AREA |
201190|WO23-000022|    24|2023-07-13 00:00:00.000|  785|         5|Finish (70)        |Finish        |2023-07-13 00:00:00.000|REL-PP  |Reliability Pouch|BM        |BREAKDOWN MAINTENANCE |         0|            |             |67375|WR23-000023    |    0|                         |   1|GP             |General plant                                      |   0|      |      |test notifications                                                                                                                                                                                                                                             |F         |           0|             |               |                          |2023-07-13 00:00:00.000|20230713        |1300            |2023-07-13 00:00:00.000|20230713        |1400            |       60.0|                       |                       |2023-07-13 00:00:00.000|2023-07-13 14:00:00.000|              0|              0|           0|     0|        |             |        0.00|     3|   1.00|            |            |70-1 Work Finish (BM) |             |
201181|WO23-000013|    24|2023-07-12 00:00:00.000|  786|         1|Work Initiated (10)|Work Initiated|2023-07-12 00:00:00.000|REL-PP  |Reliability Pouch|BM        |BREAKDOWN MAINTENANCE |         0|            |             |67363|WR23-000011    |    0|                         |   1|GP             |General plant                                      |   0|      |      |test mobile app (2)                                                                                                                                                                                                                                            |F         |           0|            0|               |                          |                       |                |                |                       |                |                |           |                       |                       |2023-07-12 00:00:00.000|2023-07-12 21:50:00.000|              0|              0|           0|     0|        |             |        0.00|     3|       |            |            |10-1 WO generated (BM)|             |
201164|WO23-00813 |    24|2023-03-03 00:00:00.000|  917|         4|In Progress (50)   |In Progress   |2023-03-03 00:00:00.000|REL-PP  |Reliability Pouch|BM        |BREAKDOWN MAINTENANCE |         0|            |             |67349|WR23-00826     |    0|                         | 829|PP-DRIA-TRAL-01|Unloader of Dryer 1                                |   0|      |      |tray robot จับ 2 tray                                                                                                                                                                                                                                          |F         |           0|             |               |                          |1900-01-01 00:00:00.000|                |1200            |1900-01-01 00:00:00.000|                |                |        0.0|1900-01-01 00:00:00.000|1900-01-01 12:00:00.000|2023-03-03 00:00:00.000|                       |              0|              0|           0|   460|2-1400  |Anan         |        0.00|     3|       |            |            |                      |DRYER AREA   |
201165|WO23-00814 |    24|2023-03-03 00:00:00.000|  917|         4|In Progress (50)   |In Progress   |2023-03-03 00:00:00.000|REL-PP  |Reliability Pouch|CM        |CORRECTIVE MAINTENANCE|         0|            |             |67351|WR23-00828     |    0|                         |1143|PP-RETA-RETO-02|Retort 2                                           |   0|      |      |มีน้ำหยดที่ VTL motor                                                                                                                                                                                                                                          |F         |           0|             |               |                          |1900-01-01 00:00:00.000|                |1200            |1900-01-01 00:00:00.000|                |                |        0.0|2023-03-03 00:00:00.000|2023-03-03 12:00:00.000|2023-03-03 00:00:00.000|2023-03-03 00:00:00.000|              0|              0|           0|   116|2-276   |Widsanu      |        0.00|     3|       |            |            |                      |             |
201054|WO23-00810 |    24|2023-03-02 00:00:00.000|  918|         1|Work Initiated (10)|Work Initiated|2023-03-02 00:00:00.000|REL-PP  |Reliability Pouch|CM        |CORRECTIVE MAINTENANCE|         0|            |             |67335|WR23-00812     |    0|                         |1101|PP-PACK-BCWE-01|Belt Check Weight 3 kg.of Packing Line A           |   0|      |      |จัดเก็บสายไฟด้านหลังให้เรียบร้อย                                                                                                                                                                                                                               |F         |           0|             |               |                          |1900-01-01 00:00:00.000|                |1200            |1900-01-01 00:00:00.000|                |                |        0.0|1900-01-01 00:00:00.000|1900-01-01 12:00:00.000|2023-03-06 00:00:00.000|                       |              0|              0|           0|   116|2-276   |Widsanu      |        0.00|     3|       |            |            |                      |PP           |
201017|WO23-00805 |    24|2023-02-25 00:00:00.000|  923|         1|Work Initiated (10)|Work Initiated|2023-03-02 00:00:00.000|REL-PP  |Reliability Pouch|PML1      |PREVENTIVE LEVEL 1    |         0|            |             |67263|WR23-00740     |    0|                         | 808|PP             |Pouch Plant                                        |   0|      |      |ท่อ supply ลมของ OFM2 เป็นสนิม มีความเสี่ยงหยุดผลิตกรณีท่อลมรั่ว                                                                                                                                                                                               |F         |           0|             |               |                          |1900-01-01 00:00:00.000|                |1200            |1900-01-01 00:00:00.000|                |                |        0.0|1900-01-01 00:00:00.000|1900-01-01 12:00:00.000|2023-04-15 00:00:00.000|                       |              0|              0|           0|   152|2-350   |Noppadon     |        0.00|     3|       |            |            |                      |             |
200973|PM23-03287 |    24|1900-01-01 00:00:00.000|45903|         3|Scheduled (30)     |Scheduled     |2023-03-02 00:00:00.000|REL-PP  |Reliability Pouch|PML2      |PREVENTIVE LEVEL 2    |         0|            |             |    0|               |12753|PP-EMUA-EMUL-PML2-W04    |4057|PP-EMUA-EMUL-11|Inotec  Emulsifier of OFM2                         |   0|      |      |Inspection & Clearing  stainer of booter pump.¶Inspection & Clearing  stainer of booter pump.                                                                                                                                                                  |F         |           0|             |               |                          |                       |                |                |                       |                |                |        0.0|2023-03-24 00:00:00.000|                       |2023-03-24 00:00:00.000|                       |              0|              0|           0|   453|2-1374  |KANOK        |        0.01|     3|       |            |            |                      |PP           |
200978|PM23-03292 |    24|1900-01-01 00:00:00.000|45903|         3|Scheduled (30)     |Scheduled     |2023-03-02 00:00:00.000|REL-PP  |Reliability Pouch|PML2      |PREVENTIVE LEVEL 2    |         0|            |             |    0|               |12755|PP-EMUA-EMUL-12-PML2-W04 |5699|PP-EMUA-EMUL-12|Inotec  Emulsifier of OFM1                         |   0|      |      |Inspection & Clearing  stainer of booter pump.¶Inspection & Clearing  stainer of booter pump.                                                                                                                                                                  |F         |           0|             |               |                          |                       |                |                |                       |                |                |        0.0|2023-03-24 00:00:00.000|                       |2023-03-24 00:00:00.000|                       |              0|              0|           0|   453|2-1374  |KANOK        |        0.01|     3|       |            |            |                      |PP           |
200974|PM23-03288 |    24|1900-01-01 00:00:00.000|45903|         3|Scheduled (30)     |Scheduled     |2023-03-02 00:00:00.000|REL-PP  |Reliability Pouch|PML2      |PREVENTIVE LEVEL 2    |         0|            |             |    0|               |12763|PP-EMUA-EMUL-PML2-W4D5   |4057|PP-EMUA-EMUL-11|Inotec  Emulsifier of OFM2                         |   0|      |      |Inspection proximity switch rotation and Guard locking sw.¶Inspection  proximity switch rotation.¶Inspection  Guard locking switch.                                                                                                                            |F         |           0|             |               |                          |                       |                |                |                       |                |                |        0.0|2023-03-24 00:00:00.000|                       |2023-03-24 00:00:00.000|                       |              0|              0|           0|   453|2-1374  |KANOK        |        0.01|     3|       |            |            |                      |PP           |

#############################################################################################################################

sp:
dbo.Dashboard_Backlog_AssignTo
run:
EXEC dbo.sp_Dashboard_Backlog_AssignTo @SiteNo = 3
result:
WOStatusName    |WOStatusNo|PERSON_NAME                |Cnt|Total|
----------------+----------+---------------------------+---+-----+
In Progress     |         4|Aree Tatongjai             | 36|  865|
Work Initiated  |         1|Aree Tatongjai             | 60|  865|
Scheduled       |         3|Aree Tatongjai             |675|  865|
Finish          |         5|Aree Tatongjai             |  9|  865|
Cancelld        |         8|Aree Tatongjai             | 85|  865|
Finish          |         5|Sutat Jaithieng            |  2|  565|
Scheduled       |         3|Sutat Jaithieng            | 14|  565|
Cancelld        |         8|Sutat Jaithieng            |435|  565|
In Progress     |         4|Sutat Jaithieng            | 89|  565|
Work Initiated  |         1|Sutat Jaithieng            | 25|  565|
In Progress     |         4|Anuwat Sawangsri           |  9|  495|
Work Initiated  |         1|Anuwat Sawangsri           |  4|  495|
Scheduled       |         3|Anuwat Sawangsri           | 27|  495|
Finish          |         5|Anuwat Sawangsri           |  5|  495|
Cancelld        |         8|Anuwat Sawangsri           |450|  495|
Scheduled       |         3|Surasak Rakpetch           |222|  489|
Finish          |         5|Surasak Rakpetch           | 46|  489|
Cancelld        |         8|Surasak Rakpetch           |195|  489|
In Progress     |         4|Surasak Rakpetch           | 17|  489|
Work Initiated  |         1|Surasak Rakpetch           |  9|  489|

#############################################################################################################################

sp:
dbo.Dashboard_Backlog_AssignTo_LV1
run:
EXEC dbo.sp_Dashboard_Backlog_AssignTo_LV1 @SiteNo = 3, @PersonName = 'Aree Tatongjai'
result:
WONO  |WoCode     |DEPTNO|WRDATE                 |DFR  |WOSTATUSNO|WOSTATUSCODE       |WOSTATUSNAME  |WODATE                 |DEPTCODE|DEPTNAME              |WOTYPECODE|WOTYPENAME            |PRIORITYNO|PRIORITYCODE|PRIORITYNAME |WRNO |REFWRCode          |PMNO |REFPMCode            |PUNO|PUCode         |PUName                                                             |EQNO|EQCode               |EQName          |Symptom                                                                                                                          |FlagPUDown|aiFlagPUDown|PUNO_Effected|PUEffectedCode|PUEffectedName|adSymptomDTSDate       |asSymptomDTSDate|asSymptomDTSTime|adSymptomDTFDate       |asSymptomDTFDate|asSymptomDTFTime|DT_Duration|adSchSDate             |SchSDate               |adSchFDate             |SchFDate               |WaitForShutDown|WaitForMaterial|WaitForOther|Assign|PlanCode|PlanFirstName|SCH_DURATION|SiteNo|ManHour|WRURGENTCODE|WRURGENTNAME|WFStatusCode          |PULOCTYPENAME|
------+-----------+------+-----------------------+-----+----------+-------------------+--------------+-----------------------+--------+----------------------+----------+----------------------+----------+------------+-------------+-----+-------------------+-----+---------------------+----+---------------+-------------------------------------------------------------------+----+---------------------+----------------+---------------------------------------------------------------------------------------------------------------------------------+----------+------------+-------------+--------------+--------------+-----------------------+----------------+----------------+-----------------------+----------------+----------------+-----------+-----------------------+-----------------------+-----------------------+-----------------------+---------------+---------------+------------+------+--------+-------------+------------+------+-------+------------+------------+----------------------+-------------+
201427|PM23-000236|    25|2021-07-07 00:00:00.000| 1521|         3|Scheduled (30)     |Scheduled     |2023-09-06 00:00:00.000|UTILITY |Site Support - Utility|PML1      |PREVENTIVE LEVEL 1    |         2|2           |Within 7 Days|    0|GP-UFPT-PUMS-L1-1W | 5483|GP-UFPT-PUMS-L1-1W   |1402|GP-UFPT-PUMS-01|Engine Fire  Pump                                                  |   0|                     |                |Engine  Fire Pump inspection & Test runing                                                                                       |F         |           0|             |              |              |                       |                |                |                       |                |                |        0.0|2021-07-07 00:00:00.000|2021-07-07 00:00:00.000|2021-07-07 00:00:00.000|2021-07-07 00:00:00.000|              0|              0|           0|    43|2-048   |Aree         |        0.00|     3|       |            |            |30-1 Work Planned (PM)|UT           |
201428|PM23-000237|    25|2021-07-14 00:00:00.000| 1514|         3|Scheduled (30)     |Scheduled     |2023-09-06 00:00:00.000|UTILITY |Site Support - Utility|PML1      |PREVENTIVE LEVEL 1    |         2|2           |Within 7 Days|    0|GP-UFPT-PUMS-L1-1W | 5483|GP-UFPT-PUMS-L1-1W   |1402|GP-UFPT-PUMS-01|Engine Fire  Pump                                                  |   0|                     |                |Engine  Fire Pump inspection & Test runing                                                                                       |F         |           0|             |              |              |                       |                |                |                       |                |                |        0.0|2021-07-14 00:00:00.000|2021-07-14 00:00:00.000|2021-07-14 00:00:00.000|2021-07-14 00:00:00.000|              0|              0|           0|    43|2-048   |Aree         |        0.00|     3|       |            |            |30-1 Work Planned (PM)|UT           |
201429|PM23-000238|    25|2021-07-21 00:00:00.000| 1507|         3|Scheduled (30)     |Scheduled     |2023-09-06 00:00:00.000|UTILITY |Site Support - Utility|PML1      |PREVENTIVE LEVEL 1    |         2|2           |Within 7 Days|    0|GP-UFPT-PUMS-L1-1W | 5483|GP-UFPT-PUMS-L1-1W   |1402|GP-UFPT-PUMS-01|Engine Fire  Pump                                                  |   0|                     |                |Engine  Fire Pump inspection & Test runing                                                                                       |F         |           0|             |              |              |                       |                |                |                       |                |                |        0.0|2021-07-21 00:00:00.000|2021-07-21 00:00:00.000|2021-07-21 00:00:00.000|2021-07-21 00:00:00.000|              0|              0|           0|    43|2-048   |Aree         |        0.00|     3|       |            |            |30-1 Work Planned (PM)|UT           |
201430|PM23-000239|    25|2021-07-28 00:00:00.000| 1500|         3|Scheduled (30)     |Scheduled     |2023-09-06 00:00:00.000|UTILITY |Site Support - Utility|PML1      |PREVENTIVE LEVEL 1    |         2|2           |Within 7 Days|    0|GP-UFPT-PUMS-L1-1W | 5483|GP-UFPT-PUMS-L1-1W   |1402|GP-UFPT-PUMS-01|Engine Fire  Pump                                                  |   0|                     |                |Engine  Fire Pump inspection & Test runing                                                                                       |F         |           0|             |              |              |                       |                |                |                       |                |                |        0.0|2021-07-28 00:00:00.000|2021-07-28 00:00:00.000|2021-07-28 00:00:00.000|2021-07-28 00:00:00.000|              0|              0|           0|    43|2-048   |Aree         |        0.00|     3|       |            |            |30-1 Work Planned (PM)|UT           |
201431|PM23-000240|    25|2021-08-04 00:00:00.000| 1493|         3|Scheduled (30)     |Scheduled     |2023-09-06 00:00:00.000|UTILITY |Site Support - Utility|PML1      |PREVENTIVE LEVEL 1    |         2|2           |Within 7 Days|    0|GP-UFPT-PUMS-L1-1W | 5483|GP-UFPT-PUMS-L1-1W   |1402|GP-UFPT-PUMS-01|Engine Fire  Pump                                                  |   0|                     |                |Engine  Fire Pump inspection & Test runing                                                                                       |F         |           0|             |              |              |                       |                |                |                       |                |                |        0.0|2021-08-04 00:00:00.000|2021-08-04 00:00:00.000|2021-08-04 00:00:00.000|2021-08-04 00:00:00.000|              0|              0|           0|    43|2-048   |Aree         |        0.00|     3|       |            |            |30-1 Work Planned (PM)|UT           |
201432|PM23-000241|    25|2021-08-11 00:00:00.000| 1486|         3|Scheduled (30)     |Scheduled     |2023-09-06 00:00:00.000|UTILITY |Site Support - Utility|PML1      |PREVENTIVE LEVEL 1    |         2|2           |Within 7 Days|    0|GP-UFPT-PUMS-L1-1W | 5483|GP-UFPT-PUMS-L1-1W   |1402|GP-UFPT-PUMS-01|Engine Fire  Pump                                                  |   0|                     |                |Engine  Fire Pump inspection & Test runing                                                                                       |F         |           0|             |              |              |                       |                |                |                       |                |                |        0.0|2021-08-11 00:00:00.000|2021-08-11 00:00:00.000|2021-08-11 00:00:00.000|2021-08-11 00:00:00.000|              0|              0|           0|    43|2-048   |Aree         |        0.00|     3|       |            |            |30-1 Work Planned (PM)|UT           |
201433|PM23-000242|    25|2021-08-18 00:00:00.000| 1479|         3|Scheduled (30)     |Scheduled     |2023-09-06 00:00:00.000|UTILITY |Site Support - Utility|PML1      |PREVENTIVE LEVEL 1    |         2|2           |Within 7 Days|    0|GP-UFPT-PUMS-L1-1W | 5483|GP-UFPT-PUMS-L1-1W   |1402|GP-UFPT-PUMS-01|Engine Fire  Pump                                                  |   0|                     |                |Engine  Fire Pump inspection & Test runing                                                                                       |F         |           0|             |              |              |                       |                |                |                       |                |                |        0.0|2021-08-18 00:00:00.000|2021-08-18 00:00:00.000|2021-08-18 00:00:00.000|2021-08-18 00:00:00.000|              0|              0|           0|    43|2-048   |Aree         |        0.00|     3|       |            |            |30-1 Work Planned (PM)|UT           |
201434|PM23-000243|    25|2021-08-25 00:00:00.000| 1472|         3|Scheduled (30)     |Scheduled     |2023-09-06 00:00:00.000|UTILITY |Site Support - Utility|PML1      |PREVENTIVE LEVEL 1    |         2|2           |Within 7 Days|    0|GP-UFPT-PUMS-L1-1W | 5483|GP-UFPT-PUMS-L1-1W   |1402|GP-UFPT-PUMS-01|Engine Fire  Pump                                                  |   0|                     |                |Engine  Fire Pump inspection & Test runing                                                                                       |F         |           0|             |              |              |                       |                |                |                       |                |                |        0.0|2021-08-25 00:00:00.000|2021-08-25 00:00:00.000|2021-08-25 00:00:00.000|2021-08-25 00:00:00.000|              0|              0|           0|    43|2-048   |Aree         |        0.00|     3|       |            |            |30-1 Work Planned (PM)|UT           |
201435|PM23-000244|    25|2021-09-01 00:00:00.000| 1465|         3|Scheduled (30)     |Scheduled     |2023-09-06 00:00:00.000|UTILITY |Site Support - Utility|PML1      |PREVENTIVE LEVEL 1    |         2|2           |Within 7 Days|    0|GP-UFPT-PUMS-L1-1W | 5483|GP-UFPT-PUMS-L1-1W   |1402|GP-UFPT-PUMS-01|Engine Fire  Pump                                                  |   0|                     |                |Engine  Fire Pump inspection & Test runing                                                                                       |F         |           0|             |              |              |                       |                |                |                       |                |                |        0.0|2021-09-01 00:00:00.000|2021-09-01 00:00:00.000|2021-09-01 00:00:00.000|2021-09-01 00:00:00.000|              0|              0|           0|    43|2-048   |Aree         |        0.00|     3|       |            |            |30-1 Work Planned (PM)|UT           |
201436|PM23-000245|    25|2021-09-08 00:00:00.000| 1458|         3|Scheduled (30)     |Scheduled     |2023-09-06 00:00:00.000|UTILITY |Site Support - Utility|PML1      |PREVENTIVE LEVEL 1    |         2|2           |Within 7 Days|    0|GP-UFPT-PUMS-L1-1W | 5483|GP-UFPT-PUMS-L1-1W   |1402|GP-UFPT-PUMS-01|Engine Fire  Pump                                                  |   0|                     |                |Engine  Fire Pump inspection & Test runing                                                                                       |F         |           0|             |              |              |                       |                |                |                       |                |                |        0.0|2021-09-08 00:00:00.000|2021-09-08 00:00:00.000|2021-09-08 00:00:00.000|2021-09-08 00:00:00.000|              0|              0|           0|    43|2-048   |Aree         |        0.00|     3|       |            |            |30-1 Work Planned (PM)|UT           |

#############################################################################################################################

sp:
EXEC dbo.sp_Dashboard_WorkBacklog_LV1 @SiteNo = 3

result:
DEPTNO|DEPTCODE|WOTYPENO|WOTYPECODE|WOSTATUSNO|WOSTATUSCODE         |Total|
------+--------+--------+----------+----------+---------------------+-----+
    23|REL-DRY |      11|CI        |         4|In Progress (50)     |   93|
    26|EE&CTRL |       3|PML1      |         1|Work Initiated (10)  |    4|
    86|SDX     |       1|BM        |         5|Finish (70)          |    1|
    23|REL-DRY |       1|BM        |         3|Scheduled (30)       |    1|
    27|STORE   |       2|CM        |         4|In Progress (50)     |    1|
    25|UTILITY |      13|OFFICE    |         4|In Progress (50)     |    1|
    24|REL-PP  |      11|CI        |         1|Work Initiated (10)  |   27|
    26|EE&CTRL |       6|OTH       |         5|Finish (70)          |    3|
    24|REL-PP  |       3|PML1      |         3|Scheduled (30)       |  574|
    25|UTILITY |       6|OTH       |         1|Work Initiated (10)  |    5|
    26|EE&CTRL |      10|PML3      |         4|In Progress (50)     |   13|
    29|PRO-DRY |       1|BM        |         1|Work Initiated (10)  |    9|
    23|REL-DRY |       9|PML2      |         1|Work Initiated (10)  |   23|

#############################################################################################################################

sp:
EXEC dbo.sp_Dashboard_WorkBacklog_LV2 @SiteNo = 3, @DeptNo = 23, @WOTypeNo = 1, @WOStatusNo = 4

retern:
WONO  |WoCode    |DEPTNO|WRDATE                 |DFR |WOSTATUSNO|WOSTATUSNO|WOSTATUSCODE    |WOSTATUSNAME|WODATE                 |DEPTCODE|DEPTNAME       |WOTYPECODE|WOTYPENAME           |PRIORITYNO|PRIORITYCODE|PRIORITYNAME|WRNO |REFWRCode |PMNO|REFPMCode|PUNO|PUCode           |PUName                                                             |EQNO|EQCode               |EQName                                                                      |Symptom                                                                      |FlagPUDown|aiFlagPUDown|PUNO_Effected|PUEffectedCode|PUEffectedName|adSymptomDTSDate       |asSymptomDTSDate|asSymptomDTSTime|adSymptomDTFDate       |asSymptomDTFDate|asSymptomDTFTime|DT_Duration|adSchSDate             |SchSDate               |adSchFDate             |SchFDate               |WaitForShutDown|WaitForMaterial|WaitForOther|Assign|PlanCode|PlanFirstName|SCH_DURATION|SiteNo|ManHour|WRURGENTCODE|WRURGENTNAME|WFStatusCode|
------+----------+------+-----------------------+----+----------+----------+----------------+------------+-----------------------+--------+---------------+----------+---------------------+----------+------------+------------+-----+----------+----+---------+----+-----------------+-------------------------------------------------------------------+----+---------------------+----------------------------------------------------------------------------+-----------------------------------------------------------------------------+----------+------------+-------------+--------------+--------------+-----------------------+----------------+----------------+-----------------------+----------------+----------------+-----------+-----------------------+-----------------------+-----------------------+-----------------------+---------------+---------------+------------+------+--------+-------------+------------+------+-------+------------+------------+------------+
 98485|WO18-03642|    23|2018-09-19 00:00:00.000|2543|         4|         4|In Progress (50)|In Progress |2018-09-19 00:00:00.000|REL-DRY |Reliability Dry|BM        |BREAKDOWN MAINTENANCE|         0|            |            |48273|WR18-03791|   0|         | 576|DP-PACK-BUCK-03  |Kibble Blending bunker 2 discharge bucket elevetor                 |   0|                     |                                                                            |ขัดตัว                                                                       |F         |           0|             |              |              |1900-01-01 00:00:00.000|                |1200            |1900-01-01 00:00:00.000|                |                |        0.0|2018-09-19 00:00:00.000|2018-09-19 12:00:00.000|2018-09-19 00:00:00.000|                       |              0|              0|           0|    85|2-178   |Chirayuth    |        0.00|     3|   0.00|            |            |            |
167405|WO21-02700|    23|2021-09-22 00:00:00.000|1444|         4|         4|In Progress (50)|In Progress |2021-09-22 00:00:00.000|REL-DRY |Reliability Dry|BM        |BREAKDOWN MAINTENANCE|         0|            |            |62297|WR21-02797|   0|         |1320|DP-CONT-MMIU-01  |MMI  PCH Receiving                                                 |   0|                     |                                                                            |mouse เสีย                                                                   |F         |           0|             |              |              |1900-01-01 00:00:00.000|                |1200            |1900-01-01 00:00:00.000|                |                |        0.0|1900-01-01 00:00:00.000|1900-01-01 12:00:00.000|2021-09-22 00:00:00.000|                       |              0|              0|           0|   350|2-738   |Junlatep     |        0.00|     3|       |            |            |            |
193253|WO22-02862|    23|2022-11-09 00:00:00.000|1031|         4|         4|In Progress (50)|In Progress |2022-11-09 00:00:00.000|REL-DRY |Reliability Dry|BM        |BREAKDOWN MAINTENANCE|         0|            |            |66025|WR22-02942|   0|         | 239|DP-DRYE-PUMS-06  |Line 2 Coating drum Veg oil delivery pump station                  |   0|                     |                                                                            |local แตก                                                                    |F         |           0|             |              |              |1900-01-01 00:00:00.000|                |1200            |1900-01-01 00:00:00.000|                |                |        0.0|1900-01-01 00:00:00.000|1900-01-01 12:00:00.000|2022-11-09 00:00:00.000|                       |              0|              0|           0|   350|2-738   |Junlatep     |        0.00|     3|       |            |            |            |
181514|WO22-00959|    23|2022-04-26 00:00:00.000|1228|         4|         4|In Progress (50)|In Progress |2022-04-26 00:00:00.000|REL-DRY |Reliability Dry|BM        |BREAKDOWN MAINTENANCE|         0|            |            |64059|WR22-00976|   0|         |5948|DP-DRYE-WBF0-02  |Line2 Coating drum infeed weight belt conveyor ( Schenck )         |   0|                     |                                                                            |flexible ขาด                                                                 |F         |           0|             |              |              |1900-01-01 00:00:00.000|                |1200            |1900-01-01 00:00:00.000|                |                |        0.0|1900-01-01 00:00:00.000|1900-01-01 12:00:00.000|2022-04-26 00:00:00.000|                       |              0|              0|           0|   350|2-738   |Junlatep     |        0.00|     3|       |            |            |            |
181537|WO22-00973|    23|2022-04-27 00:00:00.000|1227|         4|         4|In Progress (50)|In Progress |2022-04-27 00:00:00.000|REL-DRY |Reliability Dry|BM        |BREAKDOWN MAINTENANCE|         0|            |            |64074|WR22-00991|   0|         | 274|DP-EXTR-EXTR-02  |Line2 Extruder                                                     |5005|DP-EXTR-EXTR-02-TC02 |Temp Barrel  Extruder # 2 Dual thermocouple2                                |temp dift di plate                                                           |F         |           0|             |              |              |1900-01-01 00:00:00.000|                |1200            |1900-01-01 00:00:00.000|                |                |        0.0|1900-01-01 00:00:00.000|1900-01-01 12:00:00.000|2022-04-27 00:00:00.000|                       |              0|              0|           0|   350|2-738   |Junlatep     |        0.00|     3|       |            |            |            |

#############################################################################################################################

This query to create an object (table) with precomputed period for 2018-2030

-- 1. Create the DateDim (one row per calendar date; tiny table)
IF OBJECT_ID('dbo.DateDim','U') IS NOT NULL DROP TABLE dbo.DateDim;
CREATE TABLE dbo.DateDim (
  DateKey        date        NOT NULL PRIMARY KEY, -- local date
  CompanyYear    int         NOT NULL,
  CompanyWeekNo  int         NOT NULL,
  PeriodNo       int         NOT NULL,
  PeriodStart    date        NOT NULL,
  PeriodEndExcl  date        NOT NULL,             -- exclusive
  PeriodWeeks    tinyint     NOT NULL,
  HasWeek53      bit         NOT NULL
);

-- 2. Populate for the horizons you report on (e.g., 2018..2030)
DECLARE @d date='2018-01-01', @end date='2030-12-31';
WHILE @d <= @end
BEGIN
  INSERT dbo.DateDim(DateKey, CompanyYear, CompanyWeekNo, PeriodNo, PeriodStart, PeriodEndExcl, PeriodWeeks, HasWeek53)
  SELECT
    @d,
    company_year, week_no, period_no,
    CAST(period_start AS date), CAST(period_end AS date),
    period_weeks, has_week53
  FROM dbo.fn_CompanyCalendar(@d);
  SET @d = DATEADD(day, 1, @d);
END;

-- Helpful index for period filtering
CREATE INDEX IX_DateDim_Period ON dbo.DateDim(CompanyYear, PeriodNo) INCLUDE (PeriodStart, PeriodEndExcl);

The table result :


**Require funtion**
**************************************************************
```
CREATE   FUNCTION dbo.fn_CompanyYearOfDate (@d date)
RETURNS int
AS
BEGIN
  DECLARE @y int = YEAR(@d);
  DECLARE @cys date = dbo.fn_CompanyYearStart(@y);
  RETURN CASE WHEN @d >= @cys THEN @y ELSE @y - 1 END;
END;
```
**************************************************************
```
CREATE   FUNCTION dbo.fn_CompanyYearStart (@Year int)
RETURNS date
AS
BEGIN
  -- Anchor: 1900-01-07 is a Sunday. This avoids DATEFIRST dependency.
  DECLARE @jan1 date = DATEFROMPARTS(@Year, 1, 1);
  DECLARE @dow int = (DATEDIFF(day, '19000107', @jan1) % 7); -- 0=Sun,1=Mon,...6=Sat
  RETURN DATEADD(day, -@dow, @jan1); -- Sunday on/before Jan 1
END;
```
**************************************************************
```
CREATE   FUNCTION dbo.fn_CompanyWeekPeriod (@d date)
RETURNS TABLE
AS
RETURN
WITH cy AS (
  SELECT y = dbo.fn_CompanyYearOfDate(@d)
),
cys AS (
  SELECT start_date = dbo.fn_CompanyYearStart(y) FROM cy
),
pos AS (
  SELECT days = DATEDIFF(day, start_date, @d) FROM cys
),
wk AS (
  -- 1-based company week number
  SELECT week_no = (days / 7) + 1 FROM pos
)
SELECT
  company_year = cy.y,
  week_no      = wk.week_no,
  period_no    = CASE WHEN wk.week_no >= 53 THEN 13
                      ELSE ((wk.week_no - 1) / 4) + 1
                 END
FROM cy
CROSS JOIN wk;
```
**************************************************************
```
CREATE   FUNCTION dbo.fn_PeriodRange (@CompanyYear int, @Period int)
RETURNS TABLE
AS
RETURN
WITH cys AS (
  SELECT start_date = dbo.fn_CompanyYearStart(@CompanyYear)
),
p AS (
  SELECT period_start = DATEADD(day, 28 * (@Period - 1), start_date)
  FROM cys
),
len AS (
  SELECT weeks = CASE
                   WHEN @Period = 13 AND dbo.fn_HasWeek53(@CompanyYear) = 1 THEN 5
                   ELSE 4
                 END
)
SELECT
  period_start = CAST(p.period_start AS datetime2(0)),
  period_end   = CAST(DATEADD(day, 7 * weeks, p.period_start) AS datetime2(0)),
  weeks_in_period = weeks
FROM p CROSS JOIN len;
```
**************************************************************
```
CREATE   FUNCTION dbo.fn_HasWeek53 (@CompanyYear int)
RETURNS bit
AS
BEGIN
  DECLARE @this date = dbo.fn_CompanyYearStart(@CompanyYear);
  DECLARE @next date = dbo.fn_CompanyYearStart(@CompanyYear + 1);
  RETURN CASE WHEN DATEDIFF(day, @this, @next) >= 371 THEN 1 ELSE 0 END;
END;
```
**************************************************************
/* =========================================================
   Company calendar: Sunday–Saturday weeks, Period = 4 weeks
   Week 1 = week that contains Jan 1; Company Year Start = Sunday of that week
   Policy: If a company year has 53 weeks, Period 13 = 5 weeks (extended)
   ========================================================= */
```
CREATE   FUNCTION dbo.fn_CompanyCalendar (@d date)
RETURNS TABLE
AS
RETURN
/* Self-contained: does not require other helpers */
WITH
-- Company Year Start (CYS) for the Gregorian year of @d
base AS (
  SELECT
    d        = @d,
    y        = YEAR(@d),
    jan1     = DATEFROMPARTS(YEAR(@d), 1, 1),
    -- 1900-01-07 is a Sunday; this gives 0..6 where 0 = Sunday
    dow0     = (DATEDIFF(day, '19000107', DATEFROMPARTS(YEAR(@d), 1, 1)) % 7)
),
cys_this AS (
  SELECT cys = DATEADD(day, -dow0, jan1) FROM base  -- Sunday on/before Jan 1 (this Gregorian year)
),
-- Determine which company year @d belongs to
cy AS (
  SELECT company_year =
         CASE WHEN base.d >= cys_this.cys
              THEN base.y
              ELSE base.y - 1
         END
  FROM base CROSS JOIN cys_this
),
-- Recompute CYS for the actual company year
cys AS (
  SELECT
    company_year,
    jan1  = DATEFROMPARTS(company_year, 1, 1)
  FROM cy
),
cys_final AS (
  SELECT
    company_year,
    cys = DATEADD(day,
                  -(DATEDIFF(day, '19000107', jan1) % 7),
                  jan1)         -- Sunday on/before Jan 1 of company year
  FROM cys
),
-- Next company year start to detect length (52 vs 53 weeks)
cys_next AS (
  SELECT
    f.company_year,
    cys_next = DATEADD(day,
                       -(DATEDIFF(day, '19000107', DATEFROMPARTS(f.company_year + 1, 1, 1)) % 7),
                       DATEFROMPARTS(f.company_year + 1, 1, 1))
  FROM cys_final f
),
span AS (
  SELECT
    f.company_year,
    f.cys,
    n.cys_next,
    days_in_cy = DATEDIFF(day, f.cys, n.cys_next),
    has_week53 = CASE WHEN DATEDIFF(day, f.cys, n.cys_next) >= 371 THEN 1 ELSE 0 END  -- 371 = 53*7
  FROM cys_final f
  JOIN cys_next  n ON n.company_year = f.company_year
),
pos AS (
  SELECT
    s.company_year,
    s.cys,
    s.cys_next,
    s.days_in_cy,
    s.has_week53,
    days_from_cys = DATEDIFF(day, s.cys, @d)
  FROM span s
),
wk AS (
  -- Company week number is 1-based
  SELECT
    company_year,
    has_week53,
    cys,
    cys_next,
    days_in_cy,
    week_no    = (days_from_cys / 7) + 1,
    week_start = DATEADD(day, (days_from_cys / 7) * 7, cys)
  FROM pos
),
per_raw AS (
  SELECT
    company_year,
    has_week53,
    cys,
    cys_next,
    days_in_cy,
    week_no,
    week_start,
    week_end   = DATEADD(day, 7, week_start),
    -- naive 13x4 mapping (1..13, week 53 would give 14)
    period_no_raw = ((week_no - 1) / 4) + 1
  FROM wk
),
per AS (
  -- Clamp Period 13 when Week 53 exists → "Period 13 Extended" (5 weeks)
  SELECT
    company_year,
    has_week53,
    cys,
    cys_next,
    days_in_cy,
    week_no,
    week_start,
    week_end,
    period_no = CASE
                  WHEN period_no_raw > 13 THEN 13
                  ELSE period_no_raw
                END
  FROM per_raw
),
prange AS (
  SELECT
    company_year,
    has_week53,
    week_no,
    week_start,
    week_end,
    period_no,
    period_start = DATEADD(day, 28 * (period_no - 1), cys),
    period_weeks = CASE WHEN period_no = 13 AND has_week53 = 1 THEN 5 ELSE 4 END
  FROM per
)
SELECT
  company_year,
  week_no,
  week_start   = CAST(week_start   AS datetime2(0)),
  week_end     = CAST(week_end     AS datetime2(0)),   -- exclusive bound
  period_no,
  period_start = CAST(period_start AS datetime2(0)),
  period_end   = CAST(DATEADD(day, 7 * period_weeks, period_start) AS datetime2(0)), -- exclusive bound
  period_weeks,
  has_week53   = CAST(has_week53 AS bit)
FROM prange;
```
*****************************************************************************
Good!
Query to get by user stat by period over year
```
DECLARE @CompanyYear int = NULL;   -- allow NULL to mean "all"
DECLARE @Assignee    int = NULL;     -- allow NULL to mean "all"
DECLARE @WOTypeNo    int = NULL;      -- allow NULL to mean "all"
DECLARE @DEPTNO      int = NULL;     -- allow NULL to mean "all"
DECLARE @PUNO		 int = NULL;	--allow NULL to mean "all"

WITH F AS (
  SELECT
    f.*,
    -- 'YYYYMMDD' -> date
    LocalDate      = TRY_CONVERT(date, STUFF(STUFF(f.WODATE,        5,0,'-'), 8,0,'-')),
    ActFinishDate  = TRY_CONVERT(date, STUFF(STUFF(f.ACT_FINISH_D,  5,0,'-'), 8,0,'-')),
    TargetDate     = TRY_CONVERT(date, STUFF(STUFF(f.TARGET,        5,0,'-'), 8,0,'-'))
  FROM dbo.WO AS f
  WHERE (@Assignee IS NULL OR f.ASSIGN   = @Assignee)
    AND (@WOTypeNo IS NULL OR f.WOTypeNo = @WOTypeNo)
    AND (@DEPTNO   IS NULL OR f.DEPTNO   = @DEPTNO)
    AND (@PUNO IS NULL OR f.PUNO = @PUNO)
)
SELECT
  dd.CompanyYear,
  dd.PeriodNo,
  COUNT(*) AS WO_Count,
  SUM(CASE WHEN F.WRNO <> 0 THEN 1 ELSE 0 END)                          AS Has_WR,
  SUM(CASE WHEN F.WOSTATUSNO = 9 THEN 1 ELSE 0 END)                     AS History,
  SUM(CASE WHEN F.WOSTATUSNO = 8 THEN 1 ELSE 0 END)                     AS Canceled,
  SUM(CASE WHEN F.WOSTATUSNO = 6 THEN 1 ELSE 0 END)                     AS CloseToHistory,
  SUM(CASE WHEN F.WOSTATUSNO = 5 THEN 1 ELSE 0 END)                     AS Finish,
  SUM(CASE WHEN F.WOSTATUSNO = 4 THEN 1 ELSE 0 END)                     AS InProgress,
  SUM(CASE WHEN F.WOSTATUSNO = 3 THEN 1 ELSE 0 END)                     AS Scheduled,
  SUM(CASE WHEN F.WOSTATUSNO = 2 THEN 1 ELSE 0 END)                     AS PlanResource,
  SUM(CASE WHEN F.WOSTATUSNO = 1 THEN 1 ELSE 0 END)                     AS WorkInitiated,
  SUM(CASE
        WHEN F.WOSTATUSNO = 9 AND F.WRNO <> 0
         AND F.ActFinishDate IS NOT NULL AND F.TargetDate IS NOT NULL
         AND F.ActFinishDate <= F.TargetDate THEN 1 ELSE 0
      END)                                                               AS HasWR_OnTime,
  SUM(CASE
        WHEN F.WOSTATUSNO = 9 AND F.WRNO <> 0
         AND F.ActFinishDate IS NOT NULL AND F.TargetDate IS NOT NULL
         AND F.ActFinishDate  > F.TargetDate THEN 1 ELSE 0
      END)                                                               AS HasWR_Late,
    -- New KPI: On-time Rate (%)
  CAST(100.0 * SUM(CASE
        WHEN F.WOSTATUSNO = 9 AND F.WRNO <> 0
         AND F.ActFinishDate IS NOT NULL AND F.TargetDate IS NOT NULL
         AND F.ActFinishDate <= F.TargetDate THEN 1 ELSE 0
      END) / NULLIF(SUM(CASE WHEN F.WRNO <> 0 THEN 1 ELSE 0 END),0) AS DECIMAL(5,2)) AS OnTimeRatePct,
  ROUND(SUM(F.DT_Duration),2) AS Downtime
      
FROM F
JOIN dbo.DateDim AS dd
  ON dd.DateKey = F.LocalDate
WHERE (@CompanyYear IS NULL OR dd.CompanyYear = @CompanyYear)
GROUP BY dd.CompanyYear, dd.PeriodNo
ORDER BY dd.CompanyYear, dd.PeriodNo
```

**Fix Legacy Database not support newer command**
```
ALTER DATABASE [Your_Database_Name]
SET COMPATIBILITY_LEVEL = 160;
```
