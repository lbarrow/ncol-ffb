const moment = require('moment')

exports.getCurrentWeek = () => {
  const today = moment()
  if (today.isBetween(moment('2019-09-04'), moment('2019-09-11'))) {
    return 1
  }
  if (today.isBetween(moment('2019-09-11'), moment('2019-09-18'))) {
    return 2
  }
  if (today.isBetween(moment('2019-09-18'), moment('2019-09-25'))) {
    return 3
  }
  if (today.isBetween(moment('2019-09-25'), moment('2019-10-02'))) {
    return 4
  }
  if (today.isBetween(moment('2019-10-02'), moment('2019-10-09'))) {
    return 5
  }
  if (today.isBetween(moment('2019-10-09'), moment('2019-10-16'))) {
    return 6
  }
  if (today.isBetween(moment('2019-10-16'), moment('2019-10-23'))) {
    return 7
  }
  if (today.isBetween(moment('2019-10-23'), moment('2019-10-30'))) {
    return 8
  }
  if (today.isBetween(moment('2019-10-30'), moment('2019-11-06'))) {
    return 9
  }
  if (today.isBetween(moment('2019-11-06'), moment('2019-11-13'))) {
    return 10
  }
  if (today.isBetween(moment('2019-11-13'), moment('2019-11-20'))) {
    return 11
  }
  if (today.isBetween(moment('2019-11-20'), moment('2019-11-27'))) {
    return 12
  }
  if (today.isBetween(moment('2019-11-27'), moment('2019-12-04'))) {
    return 13
  }
  if (today.isBetween(moment('2019-12-04'), moment('2019-12-11'))) {
    return 14
  }
  if (today.isBetween(moment('2019-12-11'), moment('2019-12-18'))) {
    return 15
  }
  if (today.isBetween(moment('2019-12-18'), moment('2020-09-01'))) {
    return 16
  }
}
