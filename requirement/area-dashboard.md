the dashboard is for group of users in production area in factory. this area is divided people to their roles
1. Operator team - who operate the machine
2. Reliability team - who take care about machine reliability (maintenance team)

requirements
1. user is able to select time range.
    1.1 select 'year' mandatory - default to current year using company calendar
    1.2 select 'period' or 'YTD' - default to current period using company calendar
    1.3 select 'Week' optional - default to all
    1.4 select 'Date' optional - default to all
    see /helps/TIME_PERIOD_CONCEPT.md for time range concept

2. show table of counting of tickets from dbo.IgxTicket table by area.
    for each area. we will have 2 columns on the 2/3 left pane will show detail for each machine, 1/3 right show sum of area.
    
    key value that need calculations for each machines
    - open tickets
    - close tickets
    - %close
    - %close by operator team
    - %close by reliability team
    - pending tickets by operator incharge
    - pending tickets by reliability incharge
    - delay tickets
    key value that need calculation for area
    - open tickets
    - close tickets
    - %close
    each cell is able to drill down to the ticket list with those condition filter applied.

    draft UI

    | time range selector                                                                                                    
    
    Area1                                                                                                                       
    | machine | Open | Closed | %Closed | %Closed by op | %Closed by rel | pending by op | pending by rel | delay |     |       kpi card for Area1
    ---------------------------------------------------------------------------------------------------------------     |      Open   |    Close      
    | machine1 | 10  |   9   |   90%  |  20%   | 80%   |  0  |  0  | 0  |                                               |       20     |     18 
    | machine2 | 10  |   9   |   90%  |  20%   | 80%   |  0  |  0  | 0  |                                               |              90%

    Area2
    | machine | Open | Closed | %Closed | %Closed by op | %Closed by rel | pending by op | pending by rel | delay |     |  kpi card for Area2
    ---------------------------------------------------------------------------------------------------------------     |      Open   |    Close   
    | machine1 | 10  |   9   |   90%  |  20%   | 80%   |  0  |  0  | 0  |                                               |       20    |     18 
    | machine2 | 10  |   9   |   90%  |  20%   | 80%   |  0  |  0  | 0  |                                               |            90%



## technical opinion
the dashboard page should be the template for all area not only pouch area. 
please create it in the way we can reuse it eg. we can pass array of area (puid) that need to include in this page.