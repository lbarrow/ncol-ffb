<template lang="pug">
  .standings
    .standings__inner
      h2.page-title
        .page-title__sub League
        .page-title__main Standings
      table.standings-expanded(v-if="teams" cellspacing="0")
        thead
          tr
            th.standings-expanded__team-th Team
            th.standings-expanded__record-th Record
            th.standings-expanded__amount-th
              abbr(title="Points For") PF
            th.standings-expanded__amount-th
              abbr(title="Points Against") PA
            th.standings-expanded__streak-th Streak
            th.standings-expanded__history-th History
        tbody
          tr.standings-expanded__row(v-for="team in teams" @click="teamClicked(team.ownerid)")
            td(data-cell-label="team").standings-expanded__team
              .standings-expanded__team-content
                .standings-expanded__photo(:class="'owner-photo--' + team.ownerid")
                .standings-expanded__name {{ team.displayname }}
            td.standings-expanded__record(data-cell-label="Record") {{ team.wins }}-{{ team.losses }}
            td.standings-expanded__amount(data-cell-label="Points For" v-html="formatScore(team.pointsfor)")
            td.standings-expanded__amount(data-cell-label="Points Against" v-html="formatScore(team.pointsagainst)")
            td.standings-expanded__streak(data-cell-label="Streak") {{ team.streak }}
            td.standings-expanded__history(data-cell-label="History")
              .standings-expanded__history-content
                span.standings-expanded__result(v-for="result in turnHistoryToArray(team.result_history)" :class="'standings-expanded__result--' + result") {{ result }}
</template>

<script>
import axios from 'axios'
import scoreFormatter from '@/utility/scoreFormatter'

export default {
  name: 'Standings',
  data() {
    return { teams: [] }
  },
  async mounted() {
    const result = await axios.get('/api/standings/')
    this.teams = result.data
  },
  methods: {
    turnHistoryToArray(historyString) {
      return historyString.split(',')
    },
    formatScore(score) {
      return scoreFormatter(score)
    },
    teamClicked(teamId) {
      this.$router.push(`/team/${teamId}`)
    }
  }
}
</script>

<style lang="scss">
.standings {
}
.standings__inner {
}
.standings-page {
}

.standings-expanded {
  border-top: 1px solid rgba(white, 0.1);
  border-radius: 0.5rem;
  width: 100%;
  thead {
    display: none;
    @media (min-width: 48em) {
      display: table-header-group;
    }
  }
  tr {
    border-top: 1px solid rgba(white, 0.1);
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    padding: 1rem 2rem;
    transition: all 0.2s ease;
    @media (min-width: 48em) {
      padding: 0;
      display: table-row;
    }
  }
  tbody tr {
    &:hover {
      background-color: rgba($blue, 0.15);
      border-color: rgba($blue, 0.15);
      box-shadow: 0 8px 12px rgba(black, 0.8);
      transform: translateY(-0.4rem);
    }
  }
  td {
    padding: 1rem 0.5rem;
    display: block;
    text-align: center;
    @media (min-width: 48em) {
      border-top: 1px solid rgba(white, 0.1);
      display: table-cell;
      padding: 2rem 1.5rem;
    }
    &::before {
      content: attr(data-cell-label);
      display: block;
      letter-spacing: 0.1em;
      margin-bottom: 0.5rem;
      line-height: 1;
      font-size: 1rem;
      color: white;
      text-transform: uppercase;
      @media (min-width: 48em) {
        display: none;
      }
    }
  }
  th {
    color: $green;
    font-weight: normal;
    font-size: 1.2rem;
    text-align: left;
    padding: 2rem 1.5rem;
    text-transform: uppercase;
    letter-spacing: 0.2rem;
  }
  .standings-expanded__team-th {
  }
  .standings-expanded__record-th,
  .standings-expanded__amount-th,
  .standings-expanded__streak-th {
    text-align: center;
  }
  .standings-expanded__row {
    background-color: rgba(darken($blue_dark, 5), 0.65);
  }
  .standings-expanded__team {
    grid-column: 1 / 4;
    text-align: left;
    &::before {
      display: none;
    }
  }
  .standings-expanded__team-content {
    display: grid;
    grid-template-columns: 6rem 1fr;
    grid-gap: 2rem;
    align-items: center;
  }
  .standings-expanded__photo {
    width: 6rem;
    height: 6rem;
    border-radius: 100%;
    background-size: contain;
  }
  .standings-expanded__name {
    font-size: 1.8rem;
    line-height: 1.2;
    font-weight: bold;
  }
  .standings-expanded__record {
    color: $blue;
    font-size: 2.4rem;
    text-align: center;
    &::before {
      margin-bottom: 0.1rem;
    }
  }
  .standings-expanded__amount {
    font-size: 2rem;
    @media (min-width: 48em) {
      text-align: right;
    }
  }
  .standings-expanded__streak {
    font-size: 1.5rem;
    @media (min-width: 48em) {
      opacity: 0.7;
    }
  }
  .standings-expanded__history {
    grid-column: 2 / 4;
    &::before {
      text-align: left;
    }
  }
  .standings-expanded__history-content {
    display: flex;
    flex-wrap: wrap;
  }
}
.standings-expanded__result {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  margin: 0.2rem;
  border-radius: 100%;
  height: 2rem;
  width: 2rem;
}
.standings-expanded__result--W {
  color: white;
  background-color: rgba($blue, 0.5);
}
.standings-expanded__result--L {
  color: white;
  background-color: rgba($orange, 0.75);
}
</style>
