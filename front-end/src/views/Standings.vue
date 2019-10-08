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
            th.standings-expanded__amount-th Points For
            th.standings-expanded__amount-th Points Against
            th.standings-expanded__streak-th Streak
            th.standings-expanded__history-th History
        tbody
          tr.standings-expanded__row(v-for="team in teams")
            td.standings-expanded__team
              .standings-expanded__team-content
                .standings-expanded__photo(:class="'owner-photo--' + team.ownerId")
                .standings-expanded__name {{ team.displayName }}
            td.standings-expanded__record {{ team.wins }}-{{ team.losses }}
            td.standings-expanded__amount(v-html="formatScore(team.pointsFor)")
            td.standings-expanded__amount(v-html="formatScore(team.pointsAgainst)")
            td.standings-expanded__streak {{ team.streak }}
            td.standings-expanded__history
              .standings-expanded__history-content
                span.standings-expanded__result(v-for="result in team.resultHistory" :class="'standings-expanded__result--' + result") {{ result }}
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
    const result = await axios.get('http://localhost:4444/standings/')
    this.teams = result.data
  },
  methods: {
    formatScore(score) {
      return scoreFormatter(score)
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
  td {
    border-top: 1px solid rgba(white, 0.1);
    padding: 2rem 1.5rem;
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
  .standings-expanded__record-th {
    text-align: center;
  }
  .standings-expanded__amount-th {
    text-align: right;
  }
  .standings-expanded__streak-th {
    text-align: center;
  }
  .standings-expanded__row {
    background-color: rgba(darken($blue_dark, 5), 0.65);
  }
  .standings-expanded__team {
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
  }
  .standings-expanded__amount {
    font-size: 2rem;
    text-align: right;
  }
  .standings-expanded__streak {
    opacity: 0.7;
    font-size: 1.5rem;
    text-align: center;
  }
}
.standings-expanded__history-content {
  display: flex;
}
.standings-expanded__result {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  margin: 0 0.2rem;
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
