<template lang="pug">
  .matchups
    .matchups__inner
      h2.page-title
        .page-title__sub Schedule
        .page-title__main Matchups
      .matchups-page
        .league-matchups(v-if="weeks")
          ul.weeks
            li.week(v-for="week in matchupWeeks" v-if="week._id <= currentWeek")
              h3.title Week {{ week._id }}
              matchup-previews(:matchups="week.matchups" :expanded="true")
</template>

<script>
import axios from 'axios'
import MatchupPreviews from '@/components/MatchupPreviews.vue'

export default {
  name: 'Matchups',
  components: {
    MatchupPreviews
  },
  data() {
    return {
      currentWeek: undefined,
      weeks: [],
      showFuture: false
    }
  },
  computed: {
    matchupWeeks() {
      return this.weeks
    }
  },
  async mounted() {
    const result = await axios.get('/api/matchups/')
    this.currentWeek = result.data.week
    this.weeks = result.data.matchups
  }
}
</script>

<style lang="scss">
.matchups {
}
.matchups__inner {
}
.matchups-page .week {
  margin-bottom: 5rem;
}
</style>
